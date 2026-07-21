package com.example.mrschat.api;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/rag")
@CrossOrigin(origins = "*")
public class RagController {

    private static final Logger log = LoggerFactory.getLogger(RagController.class);

    private final RagWebhookService ragWebhookService;

    public RagController(RagWebhookService ragWebhookService) {
        this.ragWebhookService = ragWebhookService;
    }

    @PostMapping(value = "/vector/create", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> createVector(
            @RequestParam("file") MultipartFile[] files,
            @RequestPart(value = "body", required = false) RagVectorCreateBody body,
            @RequestParam(value = "tableName", required = false) String tableName,
            @RequestParam(value = "docType", required = false) String docType,
            @RequestParam(value = "mode", required = false) String mode
    ) throws IOException {
        String resolvedTableName = resolveTableName(body, tableName);
        String resolvedDocType = resolveDocType(body, docType);
        String resolvedMode = resolveMode(body, mode);
        int fileCount = files == null ? 0 : files.length;
        log.info(
                "Received RAG vector create: tableName={}, docType={}, mode={}, fileCount={}",
                resolvedTableName,
                resolvedDocType,
                resolvedMode,
                fileCount
        );
        String reply = ragWebhookService.createVector(files, resolvedTableName, resolvedMode, resolvedDocType);
        return ResponseEntity.ok(Map.of("reply", reply));
    }

    private String resolveTableName(RagVectorCreateBody body, String tableName) {
        if (body != null && body.tableName() != null && !body.tableName().isBlank()) {
            return body.tableName().trim();
        }
        if (tableName != null && !tableName.isBlank()) {
            return tableName.trim();
        }
        throw new IllegalArgumentException("tableName is required");
    }

    private String resolveMode(RagVectorCreateBody body, String mode) {
        if (body != null && body.mode() != null && !body.mode().isBlank()) {
            return body.mode().trim();
        }
        if (mode != null && !mode.isBlank()) {
            return mode.trim();
        }
        return "test";
    }

    private String resolveDocType(RagVectorCreateBody body, String docType) {
        if (body != null && body.docType() != null && !body.docType().isBlank()) {
            return body.docType().trim();
        }
        if (docType != null && !docType.isBlank()) {
            return docType.trim();
        }
        return "auto";
    }

    @PostMapping("/vector/delete")
    public ResponseEntity<Map<String, String>> deleteVector(@Valid @RequestBody RagDeleteRequest request) {
        String reply = ragWebhookService.deleteVector(request.tableName(), request.mode());
        return ResponseEntity.ok(Map.of("reply", reply));
    }
}
