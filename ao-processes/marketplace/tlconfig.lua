return {
    -- Teal configuration for AO marketplace process development
    source_dir = "src",
    build_dir = "build",
    
    -- Include directories for dependencies and shared types
    include_dir = {
        "../shared/types",
        "src/types"
    },
    
    -- Target Lua 5.4 for AO compatibility
    target = "5.4",
    
    -- Generate type definitions
    gen_target = "5.4",
    gen_compat = "off",
    
    -- Strict type checking for AO process safety
    warning = "all",
    
    -- Module search paths
    module_path = {
        "./src/?.tl",
        "../shared/?.tl"
    },
    
    -- Files to exclude from build
    exclude = {
        "tests/**",
        "scripts/**"
    }
}