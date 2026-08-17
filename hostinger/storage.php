<?php
// BeyondInfra file storage API — upload/get/delete, backed by this server's
// local disk. Deploy this single file to your Hostinger hosting and point
// HOSTINGER_STORAGE_URL at wherever it ends up (see README.md in this folder).

// ── Config ───────────────────────────────────────────────────────────────────
define('API_KEY', 'f96b7219b9c24cfa83bf119380d68dbf03df9f5e3f4cf42ab08d8ebe459c08d0');
define('BASE_DIR', __DIR__ . '/uploads');
define('MAX_FILE_BYTES', 25 * 1024 * 1024); // 25 MB
define('ALLOWED_ORIGINS', ['https://beyondinfraa-k9zk.vercel.app', 'http://localhost:3000']);

// ── Auth ─────────────────────────────────────────────────────────────────────
$headers = function_exists('getallheaders') ? getallheaders() : [];
$providedKey = $headers['X-Api-Key'] ?? $headers['X-API-KEY'] ?? ($_SERVER['HTTP_X_API_KEY'] ?? '');
if (!hash_equals(API_KEY, (string) $providedKey)) {
  http_response_code(401);
  echo json_encode(['error' => 'unauthorized']);
  exit;
}

$origin = $headers['X-App-Origin'] ?? $headers['X-APP-ORIGIN'] ?? ($_SERVER['HTTP_X_APP_ORIGIN'] ?? '');
if (!in_array($origin, ALLOWED_ORIGINS, true)) {
  http_response_code(403);
  echo json_encode(['error' => 'origin not allowed']);
  exit;
}

// ── Path safety ──────────────────────────────────────────────────────────────
// Only letters, numbers, dot, dash, underscore, single forward slashes as
// path separators. No "..", no leading slash, no backslash.
function safe_path(string $path): ?string {
  if ($path === '' || strpos($path, '..') !== false || $path[0] === '/' || strpos($path, '\\') !== false) {
    return null;
  }
  if (!preg_match('#^[A-Za-z0-9._\-/]+$#', $path)) {
    return null;
  }
  return $path;
}

if (!is_dir(BASE_DIR)) {
  mkdir(BASE_DIR, 0755, true);
}

$action = $_GET['action'] ?? '';

// ── Upload ───────────────────────────────────────────────────────────────────
if ($action === 'upload' && $_SERVER['REQUEST_METHOD'] === 'POST') {
  $relPath = safe_path($_POST['path'] ?? '');
  if ($relPath === null || empty($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid path or missing file']);
    exit;
  }
  if ($_FILES['file']['size'] > MAX_FILE_BYTES) {
    http_response_code(413);
    echo json_encode(['error' => 'file too large']);
    exit;
  }

  $destPath = BASE_DIR . '/' . $relPath;
  $destDir = dirname($destPath);
  if (!is_dir($destDir)) {
    mkdir($destDir, 0755, true);
  }

  if (!move_uploaded_file($_FILES['file']['tmp_name'], $destPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'upload failed']);
    exit;
  }

  echo json_encode(['ok' => true, 'path' => $relPath]);
  exit;
}

// ── Get ──────────────────────────────────────────────────────────────────────
if ($action === 'get' && $_SERVER['REQUEST_METHOD'] === 'GET') {
  $relPath = safe_path($_GET['path'] ?? '');
  if ($relPath === null) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid path']);
    exit;
  }
  $fullPath = BASE_DIR . '/' . $relPath;
  $real = realpath($fullPath);
  $baseReal = realpath(BASE_DIR);
  if ($real === false || $baseReal === false || strpos($real, $baseReal) !== 0 || !is_file($real)) {
    http_response_code(404);
    echo json_encode(['error' => 'not found']);
    exit;
  }

  header('Content-Type: application/octet-stream');
  header('Content-Length: ' . filesize($real));
  readfile($real);
  exit;
}

// ── Delete ───────────────────────────────────────────────────────────────────
if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
  $relPath = safe_path($_POST['path'] ?? '');
  if ($relPath === null) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid path']);
    exit;
  }
  $fullPath = BASE_DIR . '/' . $relPath;
  $real = realpath($fullPath);
  $baseReal = realpath(BASE_DIR);
  if ($real !== false && $baseReal !== false && strpos($real, $baseReal) === 0 && is_file($real)) {
    unlink($real);
  }
  echo json_encode(['ok' => true]);
  exit;
}

http_response_code(404);
echo json_encode(['error' => 'unknown action']);
