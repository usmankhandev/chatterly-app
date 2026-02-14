#!/bin/bash

# Test Redis Integration

echo "========================================="
echo "Testing Redis Cache Integration"
echo "========================================="
echo ""

# Check if Redis is running
echo "1. Checking Redis Connection..."
redis-cli ping || echo "❌ Redis not responding"

if [ $? -eq 0 ]; then
    echo "✅ Redis is running"
    echo ""
    
    echo "2. Testing Cache Operations..."
    
    # Set a test value
    redis-cli SET "test:key" '{"id":"123","name":"Test"}' EX 300
    echo "✅ Set cache key: test:key"
    
    # Get the value
    VALUE=$(redis-cli GET "test:key")
    echo "✅ Retrieved value: $VALUE"
    
    echo ""
    echo "3. Cache Statistics..."
    redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"
    
    echo ""
    echo "4. Memory Usage..."
    redis-cli INFO memory | grep -E "used_memory_human"
    
    echo ""
    echo "5. All Keys..."
    redis-cli KEYS "*" | head -10
    
    echo ""
    echo "6. Cleaning up test key..."
    redis-cli DEL "test:key"
    echo "✅ Test key deleted"
fi

echo ""
echo "========================================="
echo "Redis Integration Test Complete"
echo "========================================="
