# Real Data Evidence Pack

## Purpose
This document tracks the evidence that proves the backend is not relying only on curated contest samples.

## Required evidence
- Real medical directory or appointment response with masked identifiers
- Real WeChat notification or SOS delivery receipt
- Real SMS delivery receipt or provider request ID
- Real voice ASR or TTS request trace or task ID
- Real OSS upload object key or desensitized access proof
- Real location or GPS event trace linked to an SOS or replay window

## Evidence format
For each item capture:
- Date and environment
- Endpoint or operation name
- Requested mode and effective mode
- Request ID, task ID, biz ID, or message ID
- Masked payload screenshot or log reference
- Linked audit action or replay user ID

## Separation rules
- Competition seed assets remain baseline replay data.
- Real evidence must be labeled separately from seed data.
- Any unavailable live dependency must be marked as `stub` or `fallback`, never described as live.

## Recommended collection path
- Use `/api/v1/admin/system/evidence` to gather runtime status
- Use `/api/v1/admin/system/event-replay?userId=<demoUserId>` to gather care-event proof
- Attach only desensitized screenshots or log references to the defense pack
