# n8n AI Content Service Integration

This directory contains the n8n workflow for generating worksheet content using AI.

## Overview

Miss Laura uses n8n as an AI content generation service. When a teacher creates a worksheet:

1. Miss Laura backend POSTs worksheet parameters to the n8n webhook
2. n8n builds a prompt based on the parameters
3. n8n calls OpenAI (or other AI provider) to generate content
4. n8n validates the JSON response
5. Structured content is returned to Miss Laura for PDF generation

## Setup Instructions

### 1. Install n8n

```bash
# Using npm
npm install n8n -g

# Using Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### 2. Import the Workflow

1. Open n8n dashboard (default: http://localhost:5678)
2. Go to **Workflows** → **Import from File**
3. Select `worksheet-generator-workflow.json`
4. The workflow will appear in your workflows list

### 3. Configure Credentials

#### API Key Authentication
1. Go to **Settings** → **Credentials**
2. Create a new **Header Auth** credential:
   - Name: `Miss Laura API Key`
   - Header Name: `x-api-key`
   - Header Value: Your secure API key (generate a strong random string)

#### OpenAI API
1. Create a new **OpenAI API** credential:
   - Name: `OpenAI API`
   - API Key: Your OpenAI API key

### 4. Activate the Workflow

1. Open the imported workflow
2. Click **Activate** toggle in the top right
3. The webhook URL will be displayed in the Webhook node

### 5. Configure Miss Laura Backend

Add these environment variables to `backend/.env`:

```env
# n8n AI Service Integration
USE_N8N=true
N8N_WEBHOOK_URL="http://your-n8n-host:5678/webhook/worksheet-generate"
N8N_API_KEY="your-api-key-from-step-3"
```

## Workflow Structure

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Webhook   │────▶│  Validate API    │────▶│  Build AI       │
│   (POST)    │     │  Key             │     │  Prompt         │
└─────────────┘     └──────────────────┘     └─────────────────┘
                            │                        │
                            │ (invalid)              │
                            ▼                        ▼
                    ┌───────────────┐        ┌─────────────────┐
                    │  Auth Error   │        │  OpenAI Chat    │
                    │  Response     │        │                 │
                    └───────────────┘        └─────────────────┘
                                                     │
                                                     ▼
                                             ┌─────────────────┐
                                             │  Validate JSON  │
                                             │  Response       │
                                             └─────────────────┘
                                                     │
                                                     ▼
                                             ┌─────────────────┐
                                             │  Success        │
                                             │  Response       │
                                             └─────────────────┘
```

## Request Format

Miss Laura sends this payload to the webhook:

```json
{
  "curriculum": "Indian|IB|Montessori",
  "grade": "Grade 1",
  "ageGroup": "5-7 years",
  "skill": "Addition",
  "theme": "Animals",
  "questionCount": 8
}
```

Headers:
- `x-api-key`: Your configured API key
- `Content-Type`: application/json

## Response Format

### Success Response

```json
{
  "success": true,
  "content": {
    "title": "Animal Addition Adventure",
    "instructions": "Solve the addition problems with your favorite animals!",
    "questions": [
      {
        "type": "multiple-choice",
        "question": "3 lions + 2 lions = ?",
        "options": ["4 lions", "5 lions", "6 lions", "7 lions"],
        "correctAnswer": "5 lions",
        "imageUrl": null
      }
    ],
    "footer": "Indian - Grade 1"
  },
  "metadata": {
    "curriculum": "Indian",
    "grade": "Grade 1",
    "skill": "Addition",
    "theme": "Animals",
    "generatedAt": "2026-02-17T10:30:00.000Z",
    "questionCount": 8
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

## Customization

### Changing AI Model

Edit the **OpenAI Chat** node to use a different model:
- `gpt-4o-mini` (default, cost-effective)
- `gpt-4o` (more capable)
- `gpt-4-turbo` (high performance)
- `gpt-3.5-turbo` (fast, economical)

### Modifying Prompt Template

Edit the **Build AI Prompt** code node to customize:
- Question types
- Difficulty levels
- Output format
- Language/style

### Adding Retry Logic

The Miss Laura backend includes built-in retry logic (3 attempts with exponential backoff). You can also add retry nodes in n8n using the **Retry** node.

## Security Best Practices

1. **API Key**: Use a strong, randomly generated API key (32+ characters)
2. **HTTPS**: Always use HTTPS in production
3. **Rate Limiting**: Consider adding rate limiting in n8n
4. **IP Whitelist**: Restrict webhook access to Miss Laura server IP

## Monitoring

n8n provides execution logs for debugging:
1. Go to **Executions** tab
2. Click on any execution to see the full flow
3. Inspect node inputs/outputs

## Troubleshooting

### Webhook Not Responding
- Check if workflow is activated
- Verify webhook URL matches configuration
- Check n8n logs for errors

### Invalid JSON Response
- Check OpenAI API key is valid
- Review AI response in execution logs
- Adjust prompt for better JSON formatting

### Authentication Failed
- Verify API key in both n8n credential and Miss Laura .env
- Check header name matches (`x-api-key`)

## Production Deployment

For production, consider:

1. **Self-hosted n8n**: Deploy on your own server
2. **n8n Cloud**: Use n8n's managed service
3. **High Availability**: Use multiple n8n instances with load balancer
4. **Database**: Configure PostgreSQL for n8n execution data

```bash
# Example Docker Compose for production
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=secure_password
      - WEBHOOK_URL=https://n8n.yourdomain.com/
      - MISS_LAURA_API_URL=https://api.misslaura.com
    volumes:
      - n8n_data:/home/node/.n8n
    restart: always

volumes:
  n8n_data:
```

## AI Usage Tracking

The workflow automatically tracks AI token usage and reports it back to Miss Laura for quota management and cost tracking.

### How It Works

1. **Extract Usage Data**: After the OpenAI call, the workflow extracts token usage from the response
2. **Log to Miss Laura**: Usage data is sent to `/api/ai-usage/log` endpoint
3. **Quota Enforcement**: Miss Laura checks quotas before allowing new requests

### Required Credentials

In addition to the API key credential, you need to create:

1. **Internal API Key Credential** (Header Auth):
   - Name: `Miss Laura Internal API Key`
   - Header Name: `x-internal-api-key`
   - Header Value: The `INTERNAL_API_KEY` from Miss Laura backend

### Environment Variables

Set these in your n8n environment:

```env
MISS_LAURA_API_URL=http://localhost:5000  # or your production URL
```

### Usage Data Sent

```json
{
  "schoolId": "uuid",
  "userId": "uuid",
  "feature": "worksheet_generation",
  "model": "gpt-4o-mini",
  "inputTokens": 150,
  "outputTokens": 300,
  "totalTokens": 450,
  "requestId": "unique-request-id",
  "source": "ai"
}
```

### Quota Check (Optional Pre-Check)

Before calling the AI, you can check if a school has quota remaining:

```bash
curl -X GET "https://api.misslaura.com/api/ai-usage/check-quota/{schoolId}" \
  -H "x-internal-api-key: your-internal-api-key"
```

Response:
```json
{
  "success": true,
  "data": {
    "allowed": true,
    "exceeded": false,
    "usage": 50000,
    "limit": 100000,
    "percentage": 50,
    "warning": null
  }
}
```

### Workflow Diagram with Usage Tracking

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Webhook   │────▶│  Validate API    │────▶│  Build AI       │
│   (POST)    │     │  Key             │     │  Prompt         │
└─────────────┘     └──────────────────┘     └─────────────────┘
                            │                        │
                            │ (invalid)              │
                            ▼                        ▼
                    ┌───────────────┐        ┌─────────────────┐
                    │  Auth Error   │        │  OpenAI Chat    │
                    │  Response     │        │                 │
                    └───────────────┘        └─────────────────┘
                                                     │
                                                     ▼
                                             ┌─────────────────┐
                                             │  Extract Usage  │
                                             │  Data           │
                                             └─────────────────┘
                                                     │
                                                     ▼
                                             ┌─────────────────┐
                                             │  Validate JSON  │
                                             │  Response       │
                                             └─────────────────┘
                                                     │
                                     ┌───────────────┴───────────────┐
                                     │                               │
                                     ▼                               ▼
                             ┌─────────────────┐             ┌─────────────────┐
                             │  Log AI Usage   │             │  Log Error      │
                             │  (success)      │             │  Usage          │
                             └─────────────────┘             └─────────────────┘
                                     │                               │
                                     ▼                               ▼
                             ┌─────────────────┐             ┌─────────────────┐
                             │  Success        │             │  Error          │
                             │  Response       │             │  Response       │
                             └─────────────────┘             └─────────────────┘
```

## Cost Management

### OpenAI Pricing (as of 2024)

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|------------------------|
| gpt-4o-mini | $0.00015 | $0.0006 |
| gpt-4o | $0.005 | $0.015 |
| gpt-4-turbo | $0.01 | $0.03 |
| gpt-3.5-turbo | $0.0005 | $0.0015 |

### Budget Alerts

Set up budget alerts in OpenAI dashboard:
1. Go to OpenAI API Settings
2. Set monthly budget limit
3. Configure email alerts at 50%, 80%, 100%

### Dedicated API Key

For accurate cost tracking:
1. Create a dedicated OpenAI API key for Miss Laura
2. Name it `miss-laura-prod`
3. Use only this key in the n8n workflow
4. Monitor usage in OpenAI dashboard filtered by this key

---

## Complete AI Usage Tracking Implementation

### Layer 1: Dedicated OpenAI API Key (Must-Do)

1. **In OpenAI Dashboard:**
   - Create a new API key
   - Name it: `miss-laura-prod` (and `miss-laura-staging` if needed)

2. **In n8n:**
   - Update OpenAI credentials to use only this key

3. **In Your Infrastructure:**
   - Ensure no other app uses this key

**Result:** OpenAI dashboard → Usage → Filter by API key = Everything you see = Miss Laura cost

### Layer 2: Token Logging Per Request (Core Feature)

The workflow automatically captures token usage from OpenAI responses:

```javascript
// OpenAI response includes usage data:
{
  "usage": {
    "prompt_tokens": 173,
    "completion_tokens": 140,
    "total_tokens": 313
  }
}
```

**n8n Workflow Steps:**
1. After OpenAI node, the "Extract Usage Data" node extracts token counts
2. The "Log AI Usage" HTTP node sends usage to Miss Laura

**Payload sent to Miss Laura:**
```json
{
  "schoolId": "uuid",
  "userId": "uuid",
  "feature": "worksheet_generation",
  "model": "gpt-4o-mini",
  "inputTokens": 173,
  "outputTokens": 140,
  "totalTokens": 313,
  "requestId": "req_123456",
  "source": "ai"
}
```

### Layer 3: Quotas, Limits, and Enforcement

**Database Schema:**

The `SubscriptionPlan` table includes:
- `maxAiTokensPerMonth` - Token quota per month

The `Subscription` table includes:
- `currentPeriodStart` - Billing period start
- `currentPeriodEnd` - Billing period end
- `overrideMaxAiTokens` - Custom limit override

**Quota Check Flow:**

1. Before calling n8n, Miss Laura backend checks quota:
```javascript
const quota = await aiUsageService.checkQuota(schoolId);
if (quota.exceeded) {
  throw new Error('AI_QUOTA_EXCEEDED');
}
```

2. If exceeded, the request is blocked with error:
```json
{
  "error": "AI quota exceeded for this billing period"
}
```

**Usage Aggregation Query:**
```sql
SELECT SUM("totalTokens") AS "totalTokens"
FROM "AiUsageLog"
WHERE "schoolId" = $1
  AND "createdAt" BETWEEN $2 AND $3;
```

### Layer 4: Budgets & Alerts in OpenAI (Safety Net)

In OpenAI dashboard for the Miss Laura API key:

1. Set monthly budget (e.g., $500)
2. Configure email alerts at 50%, 80%, 100%
3. Optionally set hard limit

This protects you from:
- Bugs
- Abuse
- Runaway loops

### Layer 5: Admin Reports

Access AI usage analytics at `/super-admin/usage`:

**Features:**
- Tokens used: Today / This month
- By school breakdown
- By feature breakdown
- By model breakdown
- AI vs DB fallback percentage
- Cost estimate (tokens × model price)
- Quota status per school
- Alerts for schools approaching limits

---

## API Endpoints Reference

### Internal Endpoints (for n8n)

#### POST /api/ai-usage/log
Log AI usage from n8n.

**Headers:**
- `x-internal-api-key`: Your internal API key
- `Content-Type`: application/json

**Body:**
```json
{
  "schoolId": "uuid (nullable for system jobs)",
  "userId": "uuid (nullable)",
  "feature": "worksheet_generation",
  "model": "gpt-4o-mini",
  "inputTokens": 150,
  "outputTokens": 300,
  "totalTokens": 450,
  "requestId": "unique-request-id (optional)",
  "worksheetId": "uuid (optional)",
  "source": "ai",
  "metadata": {} 
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "log-uuid",
    "totalTokens": 450,
    "loggedAt": "2026-02-19T10:00:00.000Z"
  }
}
```

#### GET /api/ai-usage/check-quota/:schoolId
Check if a school has quota remaining.

**Headers:**
- `x-internal-api-key`: Your internal API key

**Response:**
```json
{
  "success": true,
  "data": {
    "allowed": true,
    "exceeded": false,
    "usage": 50000,
    "limit": 100000,
    "percentage": 50,
    "warning": null,
    "periodStart": "2026-02-01T00:00:00.000Z",
    "periodEnd": "2026-03-01T00:00:00.000Z"
  }
}
```

### Super Admin Endpoints

#### GET /api/ai-usage/global
Get global usage statistics.

**Query Parameters:**
- `from`: Start date (YYYY-MM-DD)
- `to`: End date (YYYY-MM-DD)

#### GET /api/ai-usage/alerts
Get schools approaching or exceeding limits.

#### GET /api/ai-usage/costs
Get cost breakdown report.

#### GET /api/ai-usage/ai-vs-db
Get AI vs DB fallback statistics.

### School Admin Endpoints

#### GET /api/ai-usage/school/summary
Get usage summary for current school.

#### GET /api/ai-usage/school/quota
Get quota status for current school.

---

## Environment Variables Checklist

### Miss Laura Backend (.env)
```env
# n8n Integration
USE_N8N=true
N8N_WEBHOOK_URL="https://your-n8n.com/webhook/worksheet-generate"
N8N_API_KEY="your-secure-n8n-api-key"

# Internal API Key (for n8n callbacks)
INTERNAL_API_KEY="your-secure-internal-api-key"
```

### n8n Environment
```env
MISS_LAURA_API_URL="https://api.misslaura.com"
```

---

## Troubleshooting

### Usage Not Being Logged
1. Check `INTERNAL_API_KEY` matches in both systems
2. Verify n8n can reach Miss Laura API
3. Check n8n execution logs for HTTP errors

### Quota Not Enforced
1. Verify school has a subscription with `maxAiTokensPerMonth` set
2. Check `currentPeriodStart` and `currentPeriodEnd` are set
3. Review `aiUsageService.checkQuota()` logic

### Incorrect Token Counts
1. OpenAI response format may vary by n8n version
2. Check "Extract Usage Data" node handles your response format
3. Adjust extraction logic if needed
