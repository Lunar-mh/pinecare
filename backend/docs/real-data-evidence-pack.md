# Real Data Evidence Pack

## Purpose
This document tracks the evidence that proves the backend is not relying only on curated contest samples.

## Required evidence
- Real medical directory or appointment response with masked identifiers
- Real WeChat notification or SOS delivery receipt
- Real SMS delivery receipt or provider request ID
- Real voice ASR/TTS request trace or task ID
- Real OSS upload URL or object key
- Real location/GPS event trace linked to an SOS or replay window

## Evidence format
For each item capture:
- Date and environment
- Endpoint or operation name
- Requested mode and effective mode
- Request ID / task ID / biz ID / message ID
- Masked payload screenshot or log reference
- Linked audit action or replay user ID

## Separation rules
- Competition seed assets remain baseline replay data.
- Real evidence must be labeled separately from seed data.
- Any unavailable live dependency must be marked as `stub` or `fallback`, never described as live.
