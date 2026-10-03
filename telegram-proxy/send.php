<?php
/* =========================================================================
   Безопасная отправка заявок в Telegram (серверный посредник)

   Зачем: токен бота хранится здесь, на сервере, и посетители сайта его не видят.
   Требования: хостинг с PHP 7.4+ (есть почти у всех: Beget, Timeweb, REG.RU и др.)
               и расширением curl (обычно включено).

   Как подключить:
   1. Впишите ниже BOT_TOKEN и CHAT_ID.
   2. Загрузите папку telegram-proxy/ на хостинг вместе с сайтом.
   3. В js/config.js укажите: proxyUrl: '/telegram-proxy/send.php',
      а botToken и chatId там оставьте пустыми.
   ========================================================================= */

const BOT_TOKEN = '';   // токен от @BotFather, например '1234567890:AAH...'
const CHAT_ID   = '';   // ваш chat_id или id группы

// С каких адресов принимать заявки. Впишите свой домен, например 'https://belitsky72.ru'.
// Пустой массив — принимать с любого (удобно для теста).
const ALLOWED_ORIGINS = [];

header('Content-Type: application/json; charset=utf-8');

function respond($code, $data) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['ok' => false, 'error' => 'method']);
if (BOT_TOKEN === '' || CHAT_ID === '') respond(500, ['ok' => false, 'error' => 'not-configured']);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (ALLOWED_ORIGINS && !in_array($origin, ALLOWED_ORIGINS, true)) respond(403, ['ok' => false, 'error' => 'origin']);

// Простая защита от флуда: не чаще одной заявки в 30 секунд с одного IP
$ipFile = sys_get_temp_dir() . '/lead_' . md5($_SERVER['REMOTE_ADDR'] ?? '') . '.txt';
if (is_file($ipFile) && time() - filemtime($ipFile) < 30) respond(429, ['ok' => false, 'error' => 'too-many']);
@touch($ipFile);

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) respond(400, ['ok' => false, 'error' => 'bad-json']);

$clean = function ($key, $max) use ($in) {
    $v = trim((string)($in[$key] ?? ''));
    return htmlspecialchars(mb_substr($v, 0, $max), ENT_QUOTES, 'UTF-8');
};
$name    = $clean('name', 60);
$phone   = $clean('phone', 30);
$object  = $clean('object', 80);
$comment = $clean('comment', 1000);
$page    = $clean('page', 200);

if (mb_strlen($name) < 2 || strlen(preg_replace('/\D/', '', $phone)) !== 11) {
    respond(422, ['ok' => false, 'error' => 'validation']);
}

$text = "<b>🏠 Новая заявка с сайта</b>\n\n"
      . "<b>Имя:</b> $name\n"
      . "<b>Телефон:</b> $phone\n"
      . "<b>Объект:</b> $object\n"
      . ($comment !== '' ? "<b>Комментарий:</b> $comment\n" : '')
      . "\n<i>$page</i>";

$ch = curl_init('https://api.telegram.org/bot' . BOT_TOKEN . '/sendMessage');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS     => json_encode(['chat_id' => CHAT_ID, 'text' => $text, 'parse_mode' => 'HTML'], JSON_UNESCAPED_UNICODE),
]);
$res = curl_exec($ch);
curl_close($ch);

$json = json_decode((string)$res, true);
if (!empty($json['ok'])) respond(200, ['ok' => true]);
respond(502, ['ok' => false, 'error' => 'telegram']);
