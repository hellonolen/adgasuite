# R2 Buckets

ADGA Suite uses R2 for file bodies and large artifacts. D1 stores metadata and R2 keys only.

## Buckets

- `adga-assets`: static/generated assets.
- `adga-suite-documents`: documents, PDFs, contracts, deal-room files.
- `adga-suite-uploads`: raw uploads and temporary ingestion files.

## Metadata

Every object that matters to the product should have a matching row in D1 `storage_objects`.

Target buckets for ADGA Suite:

- `adga-assets`: product images, brand assets, generated media, public-safe assets.
- `adga-suite-documents`: workspace documents, proposals, invoices, contracts, exports.
- `adga-suite-uploads`: imports, temporary uploads, source files for processing.

Access rules:

- No public bucket browsing.
- All private files are accessed through signed Worker routes.
- R2 object keys include organization scope.
- File metadata should include organization id, uploader id, document type, and checksum when available.
