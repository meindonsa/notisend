# Notisend
Server to send notification : email, notification push, etc.

## Configuration
### Generate API_KEY token
```shell
node -e "
      console.log('APP_KEYS=' + require('crypto').randomBytes(64).toString('base64'));
"
```

### Set smtp configuration
Duplicate `.env.example` to `.env` and set avaible values

### Build

```
npm install
npm run dev
```

```
open http://localhost:3000
```

## Usage

Ex:
```shel
curl -X POST http://localhost:3000/api/mail/send   -H "Content-Type: application/json"   -H "x-api-key: API_KEY"   -d '{
    "to": "<YOUR_EMAIL>",
    "subject": "Test",
    "html": "<p>it works !</p>"
  }'
```
