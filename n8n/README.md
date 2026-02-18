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
    volumes:
      - n8n_data:/home/node/.n8n
    restart: always

volumes:
  n8n_data:
```
