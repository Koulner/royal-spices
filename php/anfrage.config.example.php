<?php
// Template for royalspices-private/anfrage.config.php (outside the webroot, created once by hand,
// never committed, never touched by the deploy). Copy, fill in, chmod 600.
//
// Google Workspace with an app password:
//   1. Use a dedicated mailbox or alias, e.g. website@royalspices.de.
//   2. That account needs 2-step verification, and the Workspace admin must allow app passwords.
//   3. Google account -> Security -> App passwords -> create one for "Website".
//      The 16 characters go into 'pass' (spaces may stay).
//   smtp.gmail.com, port 465, secure 'ssl' (SMTPS)  — or port 587, secure 'tls' (STARTTLS).
//   'from' must be that mailbox (or one of its verified aliases); Gmail rewrites other senders.
//
// 'none' (no encryption) is refused unless the host is a loopback address (local tests only).
// The certificate is always verified; there is no switch to turn that off.
return [
    'smtp' => [
        'host' => 'smtp.gmail.com',
        'port' => 465,
        'secure' => 'ssl',            // ssl (465) | tls (587) | none (loopback only)
        'user' => 'website@royalspices.de',
        'pass' => '',                 // Google app password
    ],
    'from' => 'website@royalspices.de',  // Workspace mailbox that sends
    'to' => 'info@royalspices.de',       // who receives the inquiries
    // Exact origin(s) of the site; a string or a list, e.g. ['https://royalspices.de', 'https://www.royalspices.de']
    'origin' => 'https://royalspices.de',
    // Key for hashing client addresses in the rate-limit file. At least 32 random characters,
    // e.g. the output of: php -r "echo bin2hex(random_bytes(32));"
    'hmac_key' => 'CHANGE_ME',
];
