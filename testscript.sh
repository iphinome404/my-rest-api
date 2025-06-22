#!/bin/bash

echo "Testing GET /foo/bar (expect key: 123)"
curl http://localhost:3000/foo/bar
echo

echo "Testing GET /bar/foo (expect fail)"
curl http://localhost:3000/bar/foo
echo

echo "Testing HEAD /bar/foo (expect 404)"
curl -I http://localhost:3000/bar/foo
echo

echo "Testing POST /bar/foo (create key:321)"
curl -X POST http://localhost:3000/bar/foo \
  -H "Content-Type: application/json" \
  -d '{"key": "321"}'
echo

echo "Testing HEAD /bar/foo (should exist)"
curl -I http://localhost:3000/bar/foo
echo

echo "Testing GET /bar/foo (confirm created)"
curl http://localhost:3000/bar/foo
echo

echo "Testing OPTIONS /bar/foo (specific match to API_PATH)"
curl -X OPTIONS -i http://localhost:3000/bar/foo
echo

echo "Testing OPTIONS /some/other/path (should match catch-all)"
curl -X OPTIONS -i http://localhost:3000/some/other/path
echo

echo "Testing OPTIONS / (root only, catch-all route should handle)"
curl -X OPTIONS -i http://localhost:3000/
echo

echo "Testing OPTIONS /* (RFC style literal asterisk)"
curl -X OPTIONS -i http://localhost:3000/\*
echo

echo "Testing OPTIONS with no path (using literal * in URL)"
curl -X OPTIONS -i "http://localhost:3000/*"
echo

echo "Testing OPTIONS with URL-encoded asterisk"
curl -X OPTIONS -i "http://localhost:3000/%2A"
echo

echo "Testing DELETE /bar/foo"
curl -X DELETE http://localhost:3000/bar/foo
echo

echo "Testing HEAD /bar/foo (expect 404 after delete)"
curl -I http://localhost:3000/bar/foo
echo

echo "Testing GET /bar/foo (expect fail after delete)"
curl http://localhost:3000/bar/foo
echo

echo "Testing POST /bar/foo (create again key:321)"
curl -X POST http://localhost:3000/bar/foo \
  -H "Content-Type: application/json" \
  -d '{"key": "321"}'
echo

echo "Testing PUT /bar/foo (update to key:456)"
curl -X PUT http://localhost:3000/bar/foo \
  -H "Content-Type: application/json" \
  -d '{"key": "456"}'
echo

echo "Testing HEAD /bar/foo (should reflect updated length)"
curl -I http://localhost:3000/bar/foo
echo

echo "Testing GET /bar/foo (confirm updated)"
curl http://localhost:3000/bar/foo
echo

echo "Testing DELETE /bar/foo"
echo "Clean-up for the next test run"
curl -X DELETE http://localhost:3000/bar/foo
echo

