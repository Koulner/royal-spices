<?php
// Delivery over SMTP with PHPMailer (Google Workspace: smtp.gmail.com, 465 ssl or 587 tls).
// Never mail(). Certificate verification stays at PHP's default (on); SMTPOptions are not touched.
// User input only reaches the body and the structured Reply-To (PHPMailer encodes the name and
// strips line breaks); From, To and the envelope come from the configuration.
declare(strict_types=1);

namespace RoyalSpices\Anfrage;

use PHPMailer\PHPMailer\Exception as MailerException;
use PHPMailer\PHPMailer\PHPMailer;

final class Mailer
{
    public const TIMEOUT_SECONDS = 15;

    /** @throws DeliveryFailed with a message fit for the log (no form contents, no credentials) */
    public static function send(array $config, array $inquiry, string $appDir): void
    {
        $autoload = $appDir . '/vendor/autoload.php';
        if (!is_file($autoload)) {
            throw new DeliveryFailed('PHPMailer not installed (vendor/autoload.php missing)');
        }
        require_once $autoload;

        $mail = Inquiry::composeMail($inquiry);
        $smtp = $config['smtp'];
        $m = new PHPMailer(true);
        try {
            $m->isSMTP();
            $m->Host = $smtp['host'];
            $m->Port = $smtp['port'];
            $m->SMTPSecure = match ($smtp['secure']) {
                'ssl' => PHPMailer::ENCRYPTION_SMTPS,
                'tls' => PHPMailer::ENCRYPTION_STARTTLS,
                default => '',
            };
            $m->SMTPAutoTLS = $smtp['secure'] !== 'none';
            $m->SMTPAuth = ($smtp['user'] ?? '') !== '';
            $m->Username = $smtp['user'] ?? '';
            $m->Password = $smtp['pass'] ?? '';
            $m->Timeout = self::TIMEOUT_SECONDS;
            $m->SMTPDebug = 0;
            $m->CharSet = PHPMailer::CHARSET_UTF8;
            $m->Encoding = PHPMailer::ENCODING_QUOTED_PRINTABLE;
            $m->XMailer = ' ';
            $m->setFrom($config['from']);
            $m->addAddress($config['to']);
            // PHPMailer accepts a narrower set of addresses than the schema (e.g. non-ASCII).
            // Such an inquiry is still delivered, without Reply-To: the address is in the body.
            if (PHPMailer::validateAddress($inquiry['email']) && !preg_match('/[^\x20-\x7E]/', $inquiry['email'])) {
                $m->addReplyTo($inquiry['email'], $inquiry['name']);
            } else {
                Log::cause('reply-to address not accepted by PHPMailer, sent without Reply-To');
            }
            $m->isHTML(false);
            $m->Subject = $mail['subject'];
            $m->Body = $mail['text'];
            $m->send();
        } catch (MailerException $e) {
            // PHPMailer messages may quote addresses: replace user input before logging.
            throw new DeliveryFailed(self::redact($e->getMessage(), $inquiry));
        }
    }

    private static function redact(string $message, array $inquiry): string
    {
        foreach ($inquiry as $value) {
            if (is_string($value) && strlen($value) >= 3) {
                $message = str_replace($value, '[…]', $message);
            }
        }
        return preg_replace('/\s+/', ' ', $message);
    }
}

final class DeliveryFailed extends \RuntimeException
{
}
