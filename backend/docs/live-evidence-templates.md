# Live Evidence Templates

## Receipt template
- Capability:
- Environment:
- Endpoint or operation:
- Requested mode:
- Effective mode:
- Request ID / message ID / task ID:
- Masked business identifier:
- Linked replay user ID:
- Screenshot path or attachment reference:

## Screenshot template
- Page or tool:
- Timestamp:
- What is visible:
- What has been masked:
- Related audit or replay reference:

## Log reference template
- Service:
- Runtime mode:
- Success or failure:
- Request ID:
- Correlated provider key:
- Correlated user ID:
- Correlated task ID:
- Evidence file name:

## Defense script template
1. Starting point
2. Action performed
3. Expected interface to inspect
4. Expected evidence field changes
5. Rollback path if provider fails

## Rules
- Never expose raw access tokens, secret keys, full phone numbers, or full medical identifiers.
- Label every item as either `competition seed baseline` or `real live evidence`.
- Keep screenshots and logs aligned to the same request ID whenever possible.
