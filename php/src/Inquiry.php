<?php
// Inquiry rules for the PHP endpoint: a line-by-line mirror of src/lib/inquiry/schema.ts
// (inquirySchema, fieldErrors, composeMail) plus the body parsing of anfrage.ts
// (TextDecoder + URLSearchParams, first value of a repeated field wins).
// tests/ionos-php.test.mjs runs both implementations over tests/fixtures/inquiry-parity.json
// and requires identical field errors and byte-identical mail. Change both files together.
declare(strict_types=1);

namespace RoyalSpices\Anfrage;

final class Inquiry
{
    public const TOPICS = [
        'produkt' => 'Safran im Glas',
        'handel' => 'Handel / Großhandel',
        'gastronomie' => 'Gastronomie',
        'catering' => 'Catering',
        'sonstiges' => 'Etwas anderes',
    ];

    public const FORMATS = [
        '' => 'Noch offen',
        'glas' => '1-g-Glas',
        'display' => 'Display, 24 Gläser à 1 g',
        'lose' => 'Lose Ware ab 10 kg',
    ];

    /** JavaScript WhiteSpace + LineTerminator: what String.prototype.trim removes and what \s matches. */
    private const JS_SPACE = '\x{0009}-\x{000D}\x{0020}\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}';

    private const MISSING_STRING = 'Invalid input: expected string, received undefined';
    private const FORMAT_INVALID = 'Invalid option: expected one of ""|"glas"|"display"|"lose"';
    private const CONTROL_LINE = 'Bitte ohne Steuerzeichen oder Zeilenumbrüche.';

    // ------------------------------------------------------------------ body parsing

    /**
     * Raw request body -> field map, as anfrage.ts does it:
     * TextDecoder (UTF-8, BOM stripped, invalid bytes -> U+FFFD), then URLSearchParams
     * ('+' is a space, %XX decoded, malformed % kept), then the first value of each name wins.
     * Names like "name[]" stay literal names; they are not PHP arrays here.
     *
     * @return array<string,string>
     */
    public static function parseBody(string $raw): array
    {
        if (str_starts_with($raw, "\xEF\xBB\xBF")) {
            $raw = substr($raw, 3);
        }
        $raw = self::utf8Decode($raw);
        $data = [];
        foreach (explode('&', $raw) as $sequence) {
            if ($sequence === '') {
                continue;
            }
            $eq = strpos($sequence, '=');
            $name = $eq === false ? $sequence : substr($sequence, 0, $eq);
            $value = $eq === false ? '' : substr($sequence, $eq + 1);
            $name = self::utf8Decode(self::percentDecode(str_replace('+', ' ', $name)));
            $value = self::utf8Decode(self::percentDecode(str_replace('+', ' ', $value)));
            if (!array_key_exists($name, $data)) {
                $data[$name] = $value;
            }
        }
        return $data;
    }

    private static function percentDecode(string $s): string
    {
        return preg_replace_callback('/%([0-9A-Fa-f]{2})/', static fn (array $m): string => chr((int) hexdec($m[1])), $s);
    }

    /** WHATWG "UTF-8 decode without BOM": every maximal invalid subpart becomes one U+FFFD. */
    public static function utf8Decode(string $bytes): string
    {
        if (preg_match('//u', $bytes) === 1) {
            return $bytes;
        }
        $out = '';
        $n = strlen($bytes);
        $i = 0;
        while ($i < $n) {
            $c = ord($bytes[$i]);
            if ($c < 0x80) {
                $out .= $bytes[$i];
                $i++;
                continue;
            }
            if ($c >= 0xC2 && $c <= 0xDF) {
                $need = 1; $lo = 0x80; $hi = 0xBF;
            } elseif ($c >= 0xE0 && $c <= 0xEF) {
                $need = 2; $lo = $c === 0xE0 ? 0xA0 : 0x80; $hi = $c === 0xED ? 0x9F : 0xBF;
            } elseif ($c >= 0xF0 && $c <= 0xF4) {
                $need = 3; $lo = $c === 0xF0 ? 0x90 : 0x80; $hi = $c === 0xF4 ? 0x8F : 0xBF;
            } else {
                $out .= "\u{FFFD}";
                $i++;
                continue;
            }
            $j = $i + 1;
            $ok = true;
            for ($k = 0; $k < $need; $k++, $j++) {
                if ($j >= $n || ord($bytes[$j]) < $lo || ord($bytes[$j]) > $hi) {
                    $ok = false;
                    break; // the offending byte (if any) is read again as the start of a new sequence
                }
                $lo = 0x80;
                $hi = 0xBF;
            }
            $out .= $ok ? substr($bytes, $i, $need + 1) : "\u{FFFD}";
            $i = $j;
        }
        return $out;
    }

    // ------------------------------------------------------------------ JavaScript string semantics

    public static function jsTrim(string $s): string
    {
        // Form values are valid UTF-8 after parseBody; a raw header may not be, then ASCII trim suffices.
        return preg_replace('/^[' . self::JS_SPACE . ']+|[' . self::JS_SPACE . ']+$/uD', '', $s) ?? trim($s, " \t\n\v\f\r");
    }

    /**
     * Length as zod 4 measures it in .min()/.max() on strings: Unicode code points (an emoji counts 1),
     * not UTF-16 units (zod/v4/core/checks.js, codePointLength).
     */
    public static function length(string $s): int
    {
        return strlen($s) - preg_match_all('/[\x80-\xBF]/', $s);
    }

    /** String length in UTF-16 code units, like JavaScript's .length (an emoji counts 2); used where a regex counts. */
    public static function len16(string $s): int
    {
        return strlen($s) - preg_match_all('/[\x80-\xBF]/', $s) + preg_match_all('/[\xF0-\xF7]/', $s);
    }

    /** JavaScript Number(string). */
    public static function jsNumber(string $s): float
    {
        $t = self::jsTrim($s);
        if ($t === '') {
            return 0.0;
        }
        if (preg_match('/^0[xX]([0-9a-fA-F]+)$/D', $t, $m)) {
            return (float) hexdec($m[1]);
        }
        if (preg_match('/^0[oO]([0-7]+)$/D', $t, $m)) {
            return (float) octdec($m[1]);
        }
        if (preg_match('/^0[bB]([01]+)$/D', $t, $m)) {
            return (float) bindec($m[1]);
        }
        if (preg_match('/^([+-]?)Infinity$/D', $t, $m)) {
            return $m[1] === '-' ? -INF : INF;
        }
        if (preg_match('/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/D', $t)) {
            return (float) $t;
        }
        return NAN;
    }

    // ------------------------------------------------------------------ validation

    /**
     * inquirySchema.safeParse + fieldErrors.
     *
     * @param array<string,string> $data
     * @return array{ok:true, value:array<string,mixed>}|array{ok:false, fields:array<string,string>}
     */
    public static function validate(array $data): array
    {
        $errors = [];
        $v = [];
        $fail = static function (string $key, ?string $message) use (&$errors): void {
            if ($message !== null && !isset($errors[$key])) {
                $errors[$key] = $message;
            }
        };

        $anliegen = $data['anliegen'] ?? null;
        if ($anliegen === null || !array_key_exists($anliegen, self::TOPICS)) {
            $fail('anliegen', 'Bitte wähle ein Anliegen.');
        }
        $v['anliegen'] = $anliegen;

        if (!isset($data['name'])) {
            $fail('name', self::MISSING_STRING);
        } else {
            [$v['name'], $err] = self::line($data['name'], 100);
            $fail('name', $err);
            $fail('name', self::length($v['name']) < 2 ? 'Bitte nenne deinen Namen.' : null);
        }

        [$v['unternehmen'], $err] = self::optionalLine($data, 'unternehmen', 160);
        $fail('unternehmen', $err);

        if (!isset($data['email'])) {
            $fail('email', self::MISSING_STRING);
        } else {
            [$v['email'], $err] = self::line($data['email'], 180);
            $fail('email', $err);
            $fail('email', self::emailMatches($v['email']) ? null : 'Bitte gib eine gültige E-Mail-Adresse an.');
        }

        [$v['telefon'], $err] = self::optionalLine($data, 'telefon', 40);
        $fail('telefon', $err);
        $fail('telefon', preg_match('/^[0-9+()\/' . self::JS_SPACE . '.\-]*$/uD', $v['telefon']) ? null : 'Bitte nur Ziffern und die Zeichen + ( ) / - .');

        [$v['land'], $err] = self::optionalLine($data, 'land', 80);
        $fail('land', $err);

        $v['format'] = $data['format'] ?? '';
        if (!in_array($v['format'], array_map('strval', array_keys(self::FORMATS)), true)) {
            $fail('format', self::FORMAT_INVALID);
        }

        [$v['menge'], $err] = self::optionalLine($data, 'menge', 60);
        $fail('menge', $err);

        $u = $data['unterlagen'] ?? null;
        $v['unterlagen'] = $u === 'on' || $u === 'true';

        [$v['anlass'], $err] = self::optionalLine($data, 'anlass', 120);
        $fail('anlass', $err);

        $v['gaeste'] = null;
        $g = $data['gaeste'] ?? '';
        if ($g !== '') {
            $n = self::jsNumber($g);
            if (is_nan($n) || is_infinite($n)) {
                $fail('gaeste', 'Bitte eine Zahl angeben.');
            } elseif (floor($n) !== $n || abs($n) > 9007199254740991.0) {
                $fail('gaeste', 'Bitte eine ganze Zahl angeben.');
            } elseif ($n < 1) {
                $fail('gaeste', 'Mindestens 1.');
            } elseif ($n > 5000) {
                $fail('gaeste', 'Höchstens 5000.');
            } else {
                $v['gaeste'] = (int) $n;
            }
        }

        $v['termin'] = isset($data['termin']) ? self::jsTrim($data['termin']) : '';
        if (!preg_match('/^(\d{4}-\d{2}-\d{2})?$/D', $v['termin'])) {
            $fail('termin', 'Bitte ein Datum im Format JJJJ-MM-TT.');
        }

        [$v['ort'], $err] = self::optionalLine($data, 'ort', 160);
        $fail('ort', $err);

        $v['nachricht'] = isset($data['nachricht']) ? self::jsTrim($data['nachricht']) : '';
        if (self::length($v['nachricht']) > 2000) {
            $fail('nachricht', 'Bitte höchstens 2000 Zeichen.');
        } elseif (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $v['nachricht'])) {
            $fail('nachricht', 'Bitte ohne Steuerzeichen.');
        }

        return $errors ? ['ok' => false, 'fields' => $errors] : ['ok' => true, 'value' => $v];
    }

    /** z.string().trim().max(max).regex(no control characters) */
    private static function line(string $raw, int $max): array
    {
        $t = self::jsTrim($raw);
        if (self::length($t) > $max) {
            return [$t, "Bitte höchstens {$max} Zeichen."];
        }
        if (preg_match('/[\x00-\x1F\x7F]/', $t)) {
            return [$t, self::CONTROL_LINE];
        }
        return [$t, null];
    }

    private static function optionalLine(array $data, string $key, int $max): array
    {
        return isset($data[$key]) ? self::line($data[$key], $max) : ['', null];
    }

    /** /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/ without the u flag: the last part counts UTF-16 code units. */
    private static function emailMatches(string $v): bool
    {
        if (preg_match('/[' . self::JS_SPACE . ']/u', $v)) {
            return false;
        }
        $parts = explode('@', $v);
        if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
            return false;
        }
        $dot = strpos($parts[1], '.', 1);
        return $dot !== false && self::len16(substr($parts[1], $dot + 1)) >= 2;
    }

    // ------------------------------------------------------------------ mail

    /**
     * composeMail: plain-text body. Values are user input and never go into headers.
     *
     * @return array{subject:string, text:string}
     */
    public static function composeMail(array $q): array
    {
        $rows = [
            ['Anliegen', self::TOPICS[$q['anliegen']]],
            ['Name', $q['name']],
            ['Unternehmen', $q['unternehmen']],
            ['E-Mail', $q['email']],
            ['Telefon', $q['telefon']],
            ['Land / Markt', $q['land']],
        ];
        if ($q['anliegen'] === 'catering') {
            $rows[] = ['Anlass', $q['anlass']];
            $rows[] = ['Gäste', $q['gaeste'] ? (string) $q['gaeste'] : ''];
            $rows[] = ['Wunschtermin', $q['termin']];
            $rows[] = ['Ort', $q['ort']];
        } else {
            $rows[] = ['Gebinde', $q['format'] !== '' ? self::FORMATS[$q['format']] : ''];
            $rows[] = ['Gewünschte Menge', $q['menge']];
            $rows[] = ['Unterlagen', $q['unterlagen'] ? 'Bitte verfügbare Labor- und Herkunftsunterlagen mitsenden.' : ''];
        }
        $lines = [];
        foreach ($rows as [$label, $value]) {
            if ($value !== '') {
                $lines[] = "{$label}: {$value}";
            }
        }
        return [
            'subject' => 'Anfrage ' . self::TOPICS[$q['anliegen']] . ' – ' . $q['name'],
            'text' => implode("\n", $lines) . "\n\nNachricht:\n" . ($q['nachricht'] !== '' ? $q['nachricht'] : '–') . "\n",
        ];
    }
}
