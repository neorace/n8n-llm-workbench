package com.example.mrschat.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class RagWebhookService {

    private static final Logger log = LoggerFactory.getLogger(RagWebhookService.class);
    private static final Duration WEBHOOK_CONNECT_TIMEOUT = Duration.ofSeconds(10);
    private static final Duration WEBHOOK_REQUEST_TIMEOUT = Duration.ofMinutes(30);

    private final RestTemplate restTemplate;
    private final java.net.http.HttpClient httpClient;
    private final String webhookTestUrl;
    private final String webhookServiceUrl;
    private final String textExtractorTestUrl;
    private final String textExtractorServiceUrl;

    public RagWebhookService(
            RestTemplate restTemplate,
            @Value("${app.rag-webhook-test-url}") String webhookTestUrl,
            @Value("${app.rag-webhook-service-url}") String webhookServiceUrl,
            @Value("${app.text-extractor-test-url}") String textExtractorTestUrl,
            @Value("${app.text-extractor-service-url}") String textExtractorServiceUrl
    ) {
        this.restTemplate = Objects.requireNonNull(restTemplate, "restTemplate must not be null");
        this.httpClient = java.net.http.HttpClient.newBuilder()
                .connectTimeout(WEBHOOK_CONNECT_TIMEOUT)
                .version(java.net.http.HttpClient.Version.HTTP_1_1)
                .build();
        this.webhookTestUrl = Objects.requireNonNull(webhookTestUrl, "webhookTestUrl must not be null");
        this.webhookServiceUrl = Objects.requireNonNull(webhookServiceUrl, "webhookServiceUrl must not be null");
        this.textExtractorTestUrl = Objects.requireNonNull(textExtractorTestUrl, "textExtractorTestUrl must not be null");
        this.textExtractorServiceUrl = Objects.requireNonNull(textExtractorServiceUrl, "textExtractorServiceUrl must not be null");
    }

    @SuppressWarnings("null")
    public String createVector(MultipartFile[] files, String tableName, String mode, String docType)
            throws IOException {
        if (tableName == null || tableName.isBlank()) {
            throw new IllegalArgumentException("tableName is required");
        }
        if (files == null || files.length == 0) {
            throw new IllegalArgumentException("At least one file is required");
        }

        String normalizedMode = normalizeMode(mode);
        String normalizedDocType = docType == null || docType.isBlank() ? "auto" : docType.trim();
        String trimmedTableName = tableName.trim();

        String boundary = "----MrsChatRagBoundary" + UUID.randomUUID().toString().replace("-", "");
        ByteArrayOutputStream multipartBody = new ByteArrayOutputStream();
        writeTextPart(multipartBody, boundary, "action", "create");
        writeTextPart(multipartBody, boundary, "tableName", trimmedTableName);
        writeTextPart(multipartBody, boundary, "docType", normalizedDocType);
        int fileCount = 0;
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }
            String filename = file.getOriginalFilename() == null ? "upload" : file.getOriginalFilename();
            String contentType = file.getContentType();
            if (contentType == null || contentType.isBlank()) {
                contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
            }
            writeFilePart(multipartBody, boundary, "file", filename, contentType, file.getBytes());
            fileCount++;
        }
        if (fileCount == 0) {
            throw new IllegalArgumentException("At least one file is required");
        }

        String targetUrl = resolveWebhookUrl(normalizedMode);
        log.info(
                "RAG vector create: tableName={}, docType={}, mode={}, fileCount={}, target={}",
                trimmedTableName,
                normalizedDocType,
                normalizedMode,
                fileCount,
                targetUrl
        );

        writeString(multipartBody, "--" + boundary + "--\r\n");

        return postMultipart(targetUrl, boundary, multipartBody.toByteArray(), normalizedMode);
    }

    @SuppressWarnings("null")
    public String deleteVector(String tableName, String mode) {
        String normalizedMode = normalizeMode(mode);
        Map<String, Object> payload = buildDeleteBodyPayload(tableName.trim(), normalizedMode);
        String targetUrl = resolveWebhookUrl(normalizedMode);
        return postJson(targetUrl, payload, normalizedMode);
    }

    @SuppressWarnings("null")
    public String extractText(MultipartFile file, String mode, String docType) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Exactly one file is required");
        }

        String normalizedMode = normalizeMode(mode);
        String normalizedDocType = docType == null || docType.isBlank() ? "auto" : docType.trim();
        String filename = file.getOriginalFilename() == null ? "upload" : file.getOriginalFilename();
        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }
        String fileType = resolveFileType(filename, contentType);

        String boundary = "----MrsChatRagBoundary" + UUID.randomUUID().toString().replace("-", "");
        ByteArrayOutputStream multipartBody = new ByteArrayOutputStream();
        writeTextPart(multipartBody, boundary, "action", "extract");
        writeTextPart(multipartBody, boundary, "docType", normalizedDocType);
        writeTextPart(multipartBody, boundary, "fileName", filename);
        writeTextPart(multipartBody, boundary, "fileType", fileType);
        writeFilePart(multipartBody, boundary, "file", filename, contentType, file.getBytes());
        writeString(multipartBody, "--" + boundary + "--\r\n");

        String targetUrl = resolveTextExtractorUrl(normalizedMode);
        log.info(
                "RAG text extract: fileName={}, fileType={}, docType={}, mode={}, target={}",
                filename,
                fileType,
                normalizedDocType,
                normalizedMode,
                targetUrl
        );
        return postMultipart(targetUrl, boundary, multipartBody.toByteArray(), normalizedMode);
    }

    private String resolveFileType(String filename, String contentType) {
        String name = filename == null ? "" : filename.trim();
        int lastDot = name.lastIndexOf('.');
        if (lastDot >= 0 && lastDot < name.length() - 1) {
            return name.substring(lastDot + 1).toLowerCase();
        }
        if (contentType != null && !contentType.isBlank()) {
            return contentType.trim().toLowerCase();
        }
        return "unknown";
    }

    private Map<String, Object> buildDeleteBodyPayload(String tableName, String mode) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("action", "delete");
        body.put("tableName", tableName);
        body.put("mode", mode);
        return body;
    }

    private void writeTextPart(ByteArrayOutputStream output, String boundary, String name, String value)
            throws IOException {
        writeString(output, "--" + boundary + "\r\n");
        writeString(output, "Content-Disposition: form-data; name=\"" + escapeHeaderValue(name) + "\"\r\n\r\n");
        writeString(output, value);
        writeString(output, "\r\n");
    }

    private void writeFilePart(
            ByteArrayOutputStream output,
            String boundary,
            String name,
            String filename,
            String contentType,
            byte[] bytes
    ) throws IOException {
        writeString(output, "--" + boundary + "\r\n");
        writeString(
                output,
                "Content-Disposition: form-data; name=\"" + escapeHeaderValue(name) + "\"; filename=\"" +
                        escapeHeaderValue(filename) + "\"\r\n"
        );
        writeString(output, "Content-Type: " + contentType + "\r\n\r\n");
        output.write(bytes);
        writeString(output, "\r\n");
    }

    private void writeString(ByteArrayOutputStream output, String value) throws IOException {
        output.write(value.getBytes(StandardCharsets.UTF_8));
    }

    private String escapeHeaderValue(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String postMultipart(String targetUrl, String boundary, byte[] body, String mode) {
        log.info("Posting RAG multipart to {} (mode={})", targetUrl, mode);
        HttpRequest request = HttpRequest.newBuilder(URI.create(targetUrl))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .version(java.net.http.HttpClient.Version.HTTP_1_1)
                .timeout(WEBHOOK_REQUEST_TIMEOUT)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int statusCode = response.statusCode();
            if (statusCode < 200 || statusCode >= 300) {
                throw new IllegalStateException("RAG webhook returned HTTP " + statusCode + ": " + response.body());
            }
            return response.body() == null ? "" : response.body();
        } catch (IOException e) {
            throw new IllegalStateException(
                    "RAG webhook call failed (" + mode + "): " + e.getMessage(),
                    e
            );
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "RAG webhook call interrupted (" + mode + "): " + e.getMessage(),
                    e
            );
        }
    }

    private String postJson(String targetUrl, Map<String, Object> payload, String mode) {
        log.info("Posting RAG json to {} (mode={})", targetUrl, mode);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        org.springframework.http.HttpEntity<Map<String, Object>> entity =
                new org.springframework.http.HttpEntity<>(payload, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(targetUrl, entity, String.class);
            return response.getBody() == null ? "" : response.getBody();
        } catch (RestClientException e) {
            throw new IllegalStateException(
                    "RAG webhook call failed (" + mode + "): " + e.getMessage(),
                    e
            );
        }
    }

    private String resolveWebhookUrl(String mode) {
        return isServiceMode(mode) ? webhookServiceUrl : webhookTestUrl;
    }

    private String resolveTextExtractorUrl(String mode) {
        return isServiceMode(mode) ? textExtractorServiceUrl : textExtractorTestUrl;
    }

    private String normalizeMode(String mode) {
        if (mode == null || mode.isBlank()) {
            return "test";
        }
        return mode.trim();
    }

    private boolean isServiceMode(String mode) {
        String normalized = normalizeMode(mode).toLowerCase();
        return "service".equals(normalized) || "product".equals(normalized) || "prod".equals(normalized);
    }
}
