<?php
// Operator log (PHP error_log). Only causes go here: never form contents, never credentials.
declare(strict_types=1);

namespace RoyalSpices\Anfrage;

final class Log
{
    public static function cause(string $message): void
    {
        error_log('[anfrage] ' . $message);
    }
}
