# VYXARA — Hera 1.0 Text-to-Image release review evidence (lab-only)

Review date: 2026-09-05
Provider: Api18
Model: Hera 1.0 Text-to-Image
Scope: controlled local/test image validation only
Supported human decision: `approved` for inclusion in the test-only registry proposal
Production release: NO

## Public evidence reviewed

- https://api18.dev/
- https://api18.dev/docs
- https://api18.dev/docs/reference
- https://api18.dev/docs/models/hera-1.0-text-to-image

## Findings

1. Api18 lists Hera 1.0 as an image-capable model family.
2. The exact reviewed model is Hera 1.0 Text-to-Image.
3. Api18 lists Hera 1.0 Text-to-Image at USD 0.056 per image.
4. This decision is limited to the image model above and does not extend to other Hera image/video variants.

## Lab-only conclusion

Hera 1.0 Text-to-Image is suitable for the exact first controlled VYXARA image-lab validation after the separate provider-review, registry-change, credential/readiness, and explicit execution/spend gates are satisfied.

This review does not itself release the model, authorize a provider call, authorize spend, or enable production.

Recommended model review record:
- decision: `approved`
- reasonCode: `hera_t2i_lab_release_review_completed`
- validUntil: `2026-11-30T23:59:00-05:00`
