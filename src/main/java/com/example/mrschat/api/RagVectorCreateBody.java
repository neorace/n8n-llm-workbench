package com.example.mrschat.api;

public record RagVectorCreateBody(
        String tableName,
        String mode,
        String action,
        String docType
) {
}
