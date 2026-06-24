# Redis Configuration

## Overview

Redis is an optional dependency for the QA Platform. The system can operate in two modes:

1. **Redis Enabled** (`REDIS_ENABLED=true`) - Full functionality with persistence and multi-pod support
2. **Redis Disabled** (`REDIS_ENABLED=false`) - In-memory mode for development/testing

## Configuration

```env
# Redis (optional - set REDIS_ENABLED=true for multi-pod support)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Mode Comparison

| Feature | Redis Enabled | Redis Disabled |
|---------|---------------|----------------|
| Pipeline Queue | Persistent | In-memory (lost on restart) |
| SSE Events | Multi-pod broadcast | Local only |
| Job Retry | Yes | Limited |
| Multi-pod | Yes | No |
| Persistence | Yes | No |

## Risks when REDIS_ENABLED=false

### 1. Data Loss on Restart

**Risk:** All pending pipeline jobs are lost when the backend restarts.

**Impact:** 
- Long-running pipelines may be interrupted
- Jobs in queue are not persisted

**Mitigation:**
- Monitor pipeline status via UI
- Restart pipelines manually if needed

### 2. No Multi-pod Support

**Risk:** SSE events are not broadcast between pods.

**Impact:**
- Users connected to different pods may not receive real-time updates
- UI may show stale data

**Mitigation:**
- Use single-pod deployment
- Refresh page to get latest status

### 3. Limited Job Retry

**Risk:** Failed jobs have limited retry capability.

**Impact:**
- Transient failures may not be automatically retried
- Manual intervention may be required

**Mitigation:**
- Monitor job failures
- Implement manual retry in UI

### 4. No Job Persistence

**Risk:** Job history is not persisted.

**Impact:**
- Cannot audit completed jobs
- Cannot resume failed jobs after restart

**Mitigation:**
- Use database for pipeline status tracking
- Log important events to database

### 5. Concurrency Limitations

**Risk:** In-memory queue has limited concurrency control.

**Impact:**
- May process more jobs than expected under high load
- Resource contention possible

**Mitigation:**
- Monitor system resources
- Adjust queue concurrency in code

## Recommendations

### Development/Testing

```env
REDIS_ENABLED=false
```

Use in-memory mode for:
- Local development
- Unit testing
- Demo environments

### Production

```env
REDIS_ENABLED=true
REDIS_HOST=redis-cluster.corp.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
```

Use Redis for:
- Production deployments
- Multi-pod environments
- High availability requirements

## Redis Setup (if enabling)

### Docker

```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  -e REDIS_PASSWORD=your-password \
  redis:7-alpine \
  redis-server --requirepass your-password
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: password
```

## Monitoring

### Health Check

```bash
# Check Redis connection
redis-cli ping

# Check queue status
redis-cli LLEN bull:pipeline:waiting
```

### Logs

```bash
# Check Redis logs
docker logs redis

# Check backend Redis connection
grep "Redis" /var/log/qa-platform/backend.log
```

## Troubleshooting

### Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:**
1. Check if Redis is running
2. Verify REDIS_HOST and REDIS_PORT
3. Check firewall rules

### Authentication Failed

```
Error: ERR invalid password
```

**Solution:**
1. Verify REDIS_PASSWORD
2. Check Redis configuration

### Queue Stuck

```
Warning: Jobs not processing
```

**Solution:**
1. Check processor logs
2. Restart backend service
3. Clear stuck jobs: `redis-cli DEL bull:pipeline:waiting`

## Migration from In-Memory to Redis

1. Deploy Redis instance
2. Update `.env` with `REDIS_ENABLED=true`
3. Restart backend
4. Existing in-memory jobs will be lost
5. New jobs will use Redis persistence

## Migration from Redis to In-Memory

1. Ensure no active pipelines
2. Update `.env` with `REDIS_ENABLED=false`
3. Restart backend
4. Redis jobs will no longer be used
5. System will use in-memory queue
