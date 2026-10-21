<?php
/**
 * YouTube Live Data API v3 Ingestion Helper
 */

function resolveLiveChatId(string $apiKey, string $videoId): array {
    $apiKey = trim($apiKey);
    $videoId = trim($videoId);

    if (empty($apiKey) || empty($videoId)) {
        return ['success' => false, 'error' => 'API Key or Video ID is missing'];
    }

    $url = "https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=" . urlencode($videoId) . "&key=" . urlencode($apiKey);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 6,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || empty($response)) {
        return ['success' => false, 'error' => "YouTube API returned HTTP {$httpCode}"];
    }

    $data = json_decode($response, true);
    if (empty($data['items'])) {
        return ['success' => false, 'error' => "No video found with ID '{$videoId}'"];
    }

    $item = $data['items'][0];
    $title = $item['snippet']['title'] ?? 'YouTube Live Stream';
    $liveChatId = $item['liveStreamingDetails']['activeLiveChatId'] ?? null;

    if (empty($liveChatId)) {
        return ['success' => false, 'error' => 'No active Live Chat found for this video. Is the stream live?'];
    }

    return [
        'success' => true,
        'liveChatId' => $liveChatId,
        'title' => $title,
    ];
}

function fetchLiveChatMessages(string $apiKey, string $liveChatId, ?string $pageToken = null): array {
    $apiKey = trim($apiKey);
    $liveChatId = trim($liveChatId);

    $url = "https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=" . urlencode($liveChatId) . "&part=snippet,authorDetails&key=" . urlencode($apiKey);
    if (!empty($pageToken)) {
        $url .= "&pageToken=" . urlencode($pageToken);
    }

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 6,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || empty($response)) {
        return ['success' => false, 'items' => [], 'nextPageToken' => $pageToken, 'error' => "HTTP {$httpCode}"];
    }

    $data = json_decode($response, true);
    $items = [];
    if (!empty($data['items']) && is_array($data['items'])) {
        foreach ($data['items'] as $item) {
            $text = $item['snippet']['displayMessage'] ?? ($item['snippet']['textMessageDetails']['messageText'] ?? '');
            $authorName = $item['authorDetails']['displayName'] ?? 'Viewer';
            $authorId = $item['authorDetails']['channelId'] ?? $authorName;

            $items[] = [
                'id' => $item['id'],
                'user' => $authorName,
                'userId' => $authorId,
                'text' => $text,
                'publishedAt' => $item['snippet']['publishedAt'] ?? date('c'),
            ];
        }
    }

    return [
        'success' => true,
        'items' => $items,
        'nextPageToken' => $data['nextPageToken'] ?? $pageToken,
        'pollingIntervalMillis' => $data['pollingIntervalMillis'] ?? 2500,
    ];
}
