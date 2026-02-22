<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/echo-logo-text.png" width="300">
    <img src="public/echo-logo-text.png" alt="Echo  Encrypted Messaging" width="300">
  </picture>
</h1>

<p align="center">
  <strong>Military-grade end-to-end encrypted messaging. No backdoors. No exceptions.</strong>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License"></a>
  <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/Built_with-Rust-orange.svg" alt="Rust"></a>
  <a href="https://webassembly.org/"><img src="https://img.shields.io/badge/Powered_by-WebAssembly-purple.svg" alt="WebAssembly"></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React 18"></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite 5"></a>
  <a href="https://tauri.app/"><img src="https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=white" alt="Tauri"></a>
</p>

---

## What is Echo?

Echo is an open-source, end-to-end encrypted messaging app built on a custom security protocol inspired by the [Signal Protocol](https://signal.org/docs/). Every cryptographic operation  **X3DH key exchange**, **XEdDSA signing**, and **AES-256 encryption**  is powered by native Rust modules compiled to WebAssembly, running entirely client-side with zero server-side key access.

Available as a **web app** and a **native desktop app** (via Tauri).

> Developed by **Marcos Cabrero**, **Gonzalo de la Lastra**, **Miguel Mascaró** and **Nicolás Pertierra**

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Building WASM Modules](#building-wasm-modules)
  - [Running](#running)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Security Protocol](#security-protocol)
  - [X3DH (Extended Triple Diffie-Hellman)](#x3dh-extended-triple-diffie-hellman)
  - [XEdDSA (EdDSA for X25519)](#xeddsa-eddsa-for-x25519)
  - [XEdDSA Signing](#xeddsa-signing)
  - [XEdDSA Verification](#xeddsa-verification)
- [References](#references)

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 + Framer Motion |
| Routing | React Router 7 |
| Real-time | Socket.io-client 4 |
| Crypto (WASM) | Rust  `aes-wasm`, `dh-wasm`, `xeddsa-wasm` |
| Desktop | Tauri 2 |
| i18n | i18next (EN, ES, FR, DE, ZH) |
| State | React Context (AuthContext) |

---

## Getting Started

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Rust](https://rustup.rs/) (for building WASM modules and the desktop app)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/)

```bash
cargo install wasm-pack
```

### Installation

```bash
# Clone the repo
git clone https://github.com/echo-chat-protocol/echo-frontend.git
cd echo-frontend

# Install dependencies
npm install
```

### Building WASM Modules

Each Rust module must be compiled to WASM before running the app:

```bash
# AES-256 encryption
cd aes-wasm && wasm-pack build --target web && cd ..

# X25519 / Diffie-Hellman
cd dh-wasm && wasm-pack build --target web && cd ..

# XEdDSA signatures
cd xeddsa-wasm && wasm-pack build --target web && cd ..
```

### Running

```bash
# Web (development)
npm run dev

# Web (production build)
npm run build
npm run preview

# Desktop app (Tauri)
npm run tauri dev
```

---

## Environment Variables

Copy `.env.development` and fill in your values:

```bash
cp .env.development .env.local
```

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend REST API base URL |
| `VITE_SOCKET_URL` | Socket.io server URL |

---

## Project Structure

```
echo-frontend/
 src/
    components/
       auth/               # Login, Register, PrivateRoute
       common/             # ErrorBoundary, Spinner, Toast
       Dashboard/          # Main chat UI
       HomepageComponents/ # Navbar, Footer, Blog
       landing/            # Hero, Features, Pricing
    hooks/                  # useAuth, useSocket, useConversations
    services/               # socket.js, api.js
    store/                  # AuthContext
    pages/                  # Top-level route pages
    i18n/                   # Translations (EN ES FR DE ZH)
 aes-wasm/                   # Rust AES-256 WASM module
 dh-wasm/                    # Rust X25519 DH WASM module
 xeddsa-wasm/                # Rust XEdDSA WASM module
 src-tauri/                  # Tauri desktop configuration
 public/                     # Static assets
```

---

## Security Protocol

## **X3DH (Extended Triple Diffie-Hellman)**

X3DH is a key agreement protocol used to establish a shared secret between two parties (e.g., Alice and Bob) using public-key cryptography. It ensures **forward secrecy** and **deniability**.

### **Key Exchange Process**

1. **Public Key Components**:
   - Each user has:
     - **Identity Key (IK)**: Long-term key pair for authentication.
     - **Signed Prekey (SPK)**: Short-term key signed by `IK`, rotated periodically.
     - **One-Time Prekeys (OPK)**: Optional single-use keys for forward secrecy.

2. **Key Exchange Steps**:
   - Alice fetches Bob's prekeys (`IK_B`, `SPK_B`, `OPK_B`).
   - Alice verifies `SPK_B`'s signature using `IK_B` (via **XEdDSA**).
   - Alice performs **four DH operations**:
     ```python
     DH1 = DH(IK_A, SPK_B)   # Alice-Identity and Bob-SignedPreKey
     DH2 = DH(EK_A, IK_B)    # Alice-Ephemeral and Bob-Identity
     DH3 = DH(EK_A, SPK_B)   # Alice-Ephemeral and Bob-SignedPreKey
     DH4 = DH(EK_A, OPK_B)   # Alice-Ephemeral and Bob-OneTimeKey
     ```
   - The shared secret is derived as:
     ```python
     SK = KDF(DH1 || DH2 || DH3 || DH4)
     ```

---

## **XEdDSA (EdDSA for X25519)**

XEdDSA is a signature scheme based on the Edwards-curve Digital Signature Algorithm (EdDSA). EdDSA is designed for Twisted-Edwards curves, however since we use X25519 (Montgomery form) for Diffie-Hellman operations, keys must be converted to Edwards form before signing. This pre-conversion is the key distinction of XEdDSA.

### **How It Works**

#### Prerequisites

`Encoding`  For storing points, usually 64 bytes (32 for X, 32 for Y). We compress by dropping X and storing a sign bit; X is recalculated on decode.

`SHA-512`  Hashing algorithm producing a 512-bit digest from any input.

`Scalar Multiplication`  Repeated addition of a point on the curve to itself; the keystone operation in ECC.

`Clamping`  Byte-level adjustment of keys to prevent subgroup attacks.

| Byte Index | Description | Operation | Purpose |
|---|---|---|---|
| 0 | Least significant | `a[0] &= 248` | Clears bits 0-2; makes scalar a multiple of 8 |
| 130 | Middle bytes |  | Retains entropy |
| 31 | Most significant | `a[31] &= 127; a[31] \|= 64` | Keeps scalar in [2, 2) |

#### Key Terminology

| Term | Description | Curve Form |
|---|---|---|
| `xprivIK` | X25519 private key (32-byte scalar) | Montgomery |
| `xpubIK` | X25519 public key (derived from `xprivIK`) | Montgomery |
| `xpubPK` | X25519 public pre-key | Montgomery |
| `a` | Clamped Edwards private scalar (from `xprivIK`) | Edwards |
| `Prefix` | Generated alongside `a` from SHA-512 of `xprivIK` |  |
| `A` | Edwards public key (derived from `a`) | Edwards |
| `r` | Deterministic nonce |  |
| `R` | Nonce point (`R = r * B`) | Edwards |
| `k` | Challenge hash (`k = H(R  A  M) mod L`) |  |
| `S` | Signature scalar (`S = (r + k * a) mod L`) |  |
| `L` | Curve order (`2 + 27742317777372353535851937790883648493`) |  |
| `B` | Basepoint (curve generator) | Edwards/Montgomery |

### XEdDSA Signing

1. **Initial Key Conversion**  Run `xprivIK` through SHA-512. First 32 bytes  clamped scalar `a`. Last 32 bytes  `Prefix`.

2. **Compute Deterministic Nonce**

   $$r = \text{SHA}(\text{Prefix} \mathbin{\|} \text{message}) \bmod L$$

   Pass `xpubPK` as the message to sign the PreKey.

3. **Compute Nonce Point**

   $$R = B \cdot r$$

   Encode `R` to 32 bytes (Y coordinate + sign bit of X).

4. **Recompute Public Key in Edwards Form**  Repeat SHA-512 on `xprivIK`, clamp first 32 bytes, then `A = B * a`. Encode to 32 bytes.

5. **Compute Challenge Hash**

   $$k = \text{SHA}(R \mathbin{\|} A \mathbin{\|} \text{message}) \bmod L$$

6. **Compute Signature Scalar**

   $$S = (r + k \cdot a) \bmod L$$

7. **Final Signature**

   $$\text{Signature} = R \mathbin{\|} S$$

### XEdDSA Verification

1. **Decompress Inputs**  Extract `R` and `S` from the signature. Convert received public key to Edwards form.

2. **Compute Challenge Hash**

   $$k = \text{SHA}(R \mathbin{\|} A \mathbin{\|} \text{message}) \bmod L$$

3. **Verify**

   $$S \cdot B \stackrel{?}{=} R + k \cdot A$$

   If the equation holds, the signature is valid.

---

## References

- [Signal XEdDSA Specification](https://signal.org/docs/specifications/xeddsa/)
- [RFC 8032  Edwards-Curve Digital Signature Algorithm (EdDSA)](https://datatracker.ietf.org/doc/html/rfc8032)
- [RFC 7748  Elliptic Curves for Security (Curve25519)](https://datatracker.ietf.org/doc/html/rfc7748)
- [The Signal Protocol](https://signal.org/docs/)
