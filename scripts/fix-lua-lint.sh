#!/bin/bash

# Fix Lua linting issues: trailing spaces and unused imports

echo "Fixing Lua linting issues..."

# Fix trailing spaces in all Lua files
find ao-processes -name "*.lua" -o -name "*.tl" | while read file; do
    if [ -f "$file" ]; then
        echo "Fixing trailing spaces in: $file"
        # Remove trailing spaces
        sed -i '' 's/[[:space:]]*$//' "$file"
        # Remove lines with only spaces
        sed -i '' '/^[[:space:]]*$/d' "$file"
    fi
done

find shared -name "*.tl" | while read file; do
    if [ -f "$file" ]; then
        echo "Fixing trailing spaces in: $file"
        # Remove trailing spaces
        sed -i '' 's/[[:space:]]*$//' "$file"
        # Remove lines with only spaces
        sed -i '' '/^[[:space:]]*$/d' "$file"
    fi
done

echo "Trailing spaces fixed."

# Remove unused imports in registry process (based on diagnostics)
echo "Removing unused imports from registry process..."
if [ -f "ao-processes/registry/src/main.lua" ]; then
    # Comment out unused ErrorHandler and ADPValidator imports
    sed -i '' 's/^local ErrorHandler = require/-- local ErrorHandler = require/' ao-processes/registry/src/main.lua
    sed -i '' 's/^local ADPValidator = require/-- local ADPValidator = require/' ao-processes/registry/src/main.lua
    echo "Unused imports commented out in registry process"
fi

echo "Lua linting fixes completed."