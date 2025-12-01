# Installing Scarb on Windows

## Quick Install Options

### Option 1: Download Pre-built Binary (Recommended)

1. Go to: https://github.com/software-mansion/scarb/releases
2. Download the latest `scarb-x86_64-pc-windows-msvc.zip`
3. Extract the zip file
4. Copy `scarb.exe` to a folder in your PATH (e.g., `C:\Users\YourName\bin`)
5. Or add the extracted folder to your PATH

### Option 2: Install via Cargo (Requires Rust + Visual Studio Build Tools)

```bash
cargo install --locked scarb --git https://github.com/software-mansion/scarb --tag v2.8.1
```

**Note:** This requires Visual Studio 2017+ with C++ build tools.

### Option 3: Use Scoop (if available)

```bash
scoop bucket add extras
scoop install scarb
```

## Verify Installation

```bash
scarb --version
```

Should output: `scarb 2.8.1` or similar

## After Installation

Once Scarb is installed, you can:

```bash
# Build contracts
scarb build

# Deploy contracts
npm run deploy
```

