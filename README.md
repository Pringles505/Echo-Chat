<h1 align="center">
  <picture>
    <!-- Dark mode logo -->
    <source 
      srcset="logoTextDark.png" 
      media="(prefers-color-scheme: dark)"
      width="300" 
      height="130"
    >
    <!-- Light mode logo -->
    <img 
      src="logoTextLight.png" 
      alt="Echo Logo" 
      width="300" 
      height="130"
    >
  </picture>
</h1>

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Rust](https://img.shields.io/badge/Built_with-Rust-orange.svg)](https://www.rust-lang.org/)
[![WASM](https://img.shields.io/badge/Powered_by-WebAssembly-purple.svg)](https://webassembly.org/)

# What is Echo?

Echo is an open-source, end-to-end encrypted chat app built with a security protocol inspired by the [**Signal Protocol**](https://signal.org/docs/). All cryptographic operations in Echo are powered by custom Rust modules developed from the ground up, the modules power all **X3DH**, **XEdDSA**, **AES-256** functions.

Developed by 2ºCEB students **Marcos Cabrero**, **Gonzalo de la Lastra**, and **Miguel Mascaró** at IMMUNE Institute of Technology.

## Table of Contents  
- [Security Protocol](#security-protocol)  
  - [X3DH (Extended Triple Diffie-Hellman)](#x3dh-extended-triple-diffie-hellman)  
  - [XEdDSA (EdDSA for X25519)](#xeddsa-eddsa-for-x25519)  
- [Setup](#setup)  
- [References](#references)  

# Security Protocol

## **X3DH (Extended Triple Diffie-Hellman)**
X3DH is a key agreement protocol used to establish a shared secret between two parties (e.g., Alice and Bob) using public-key cryptography. It ensures **forward secrecy** and **deniability**.

### **Key Exchange Process**
1. **Public Key Components**:
   - Each user has:
     - **Identity Key (IK)**: Long-term key pair for authentication.
     - **Signed Prekey (SPK)**: Short-term key signed by `IK`, rotated periodically.
     - **One-Time Prekeys (OPK)**: Optional single-use keys for forward secrecy.

2. **Key Exchange Steps**:
   - Alice fetches Bob’s prekeys (`IK_B`, `SPK_B`, `OPK_B`).
   - Alice verifies `SPK_B`’s signature using `IK_B` (via **XEdDSA**).
   - Alice performs **three DH operations**:
     ```python
     DH1 = DH(IK_A, SPK_B)       # Alice-Identity and Bob-SignedPreKey
     DH2 = DH(EK_A, IK_B)        # Alice-Ephemeral and Bob-Identity
     DH3 = DH(EK_A, SPK_B)       # Alice-Ephemeral and Bob-SignedPreKey
     DH4 = DH(EK_A, OPK_B)       # Alice-Epehemeral and Bob-OneTimeKey
     ```
   - The shared secret is derived as:
     ```python
     SK = KDF(DH1 || DH2 || DH3 || DH4)
     ```
---
## **XEdDSA (EdDSA for X25519)**
XEdDSA is a signature scheme based on the Edwards-curve digital signature algorithm (EdDSA). EdDSA is designed for Twisted-Edwards curves, however, since we use curve X25519 elliptic-curve for the diffie-hellman operations, keys are in Montgomery form so we must convert them into Edwards form and compute EdDSA. This preconversion of the input from Montgomery form to Edwards form is the key distinction of XEdDSA.
### **How It Works**

#### **Prerequisites**

`SHA-512` is a hashing algorithm used to convert text of any size into a fixed-size string.

`Scalar Multiplication` in the context of Elliptic Curve Cryptography, is the repeated addition of a point on the curve to itself, this is the keystone in ECC

`Clamping` is the process by which the keys are adjusted by byte, preventing certain subgroup attacks and from foreign malicious public key attacks.
| Byte Index | Description             | Operation                       | Bit Constraint Result             | Purpose                                                  |
|------------|-------------------------|----------------------------------|-----------------------------------|----------------------------------------------------------|
| 0          | Least significant byte  | `a[0] &= 248`                    | Clears bits 0, 1, 2               | Ensures scalar is a multiple of 8    |
| 1–30       | Middle bytes            | —                                | No change                         | Retains entropy for randomness                          |
| 31         | Most significant byte   | `a[31] &= 127; a[31] |= 64`      | Clears bit 255, sets bit 254      | Ensures scalar is between 2²⁵⁴ and 2²⁵⁵−1 for security   |


#### **Key Terminology**
| Term         | Description                                                                 | Curve Form       |
|--------------|-----------------------------------------------------------------------------|------------------|
| `xprivIK`   | X25519 private key (32-byte scalar)                                         | Montgomery       |
| `xpubIK`    | X25519 public key (Derived from  `xprivIK`)                                | Montgomery       |
| `xpubPK`    | X25519 public pre key (Derived from  `xprivPK`)                                | Montgomery       |
| `a`          | Clamped Edwards private scalar (derived from `xprivIK`)                    | Edwards          |
| `Prefix`          | Generated with `a` (derived from `xprivIK`)                            | Edwards     |
| `A`          | Edwards public key (derived from `a`)                                       | Edwards          |
| `r`          | Deterministic nonce                                                         | Edwards          |
| `R`          | Nonce point (`R = r * B`)                                                   | Edwards          |
| `k`          | Challenge hash (`k = H(R ‖ A ‖ M)`, where `H` is SHA-512)                   |                  |
| `S`          | Signature scalar (`S = (r + k * a) mod L`)                                  | Edwards          |
| `L`          | Order of the curve (`2²⁵² + 27742317777372353535851937790883648493`)        |                  |
| `B`          | Basepoint (curve generator)                                                 | Edwards/Montgomery |

1. **Initial Key Conversion**:
   Initially an XEdDSA key is computed by running the `xprivIK` through SHA-512. This outputs a 64 byte array, the first 32 bytes are `clamped` and become `a`. The last 32 bytes become the `Prefix`
     
2. **Compute Deterministic Nonce**:

   $r = SHA(Prefix + message) % L$

    We will pass `xpubPK` as the message to compute the nonce, this will effectively `sign` the PreKey.
   
3. **Compute Nonce Point**:

   $R = B ⋅ r$

   The Nonce point is computed by performing a `Scalar Multiplcation` between the `nonce` and the `Basepoint`

4. **Recompute Public Key in Edwards Form**:

   Similarly as in the initial key conversion, the `xprivIK` is ran through SHA-512 and the first 32 bytes are 
   
6. **Signing Prekeys**:
   - Bob signs his `SPK_B` using his identity key:
     ```python
     signature = XEdDSA_sign(IK_B_private, SPK_B_public)
     ```
   - Alice verifies the signature:
     ```python
     assert XEdDSA_verify(IK_B_public, SPK_B_public, signature)
     ```

7. **Why It Matters**:
   - 🛡️ **Prevents MITM Attacks**: Ensures `SPK_B` truly belongs to Bob.
   - ⚡ **Efficient**: Fast Ed25519-based signatures.

---

# Setup

Install [**Rust**](https://rustup.rs/) with Rustup

Install `wasm-pack`
```bash
cargo install wasm-pack
```

Clone the project
```bash
git clone https://github.com/Mascaro101/Echo-Chat-App
```
Install Dependencies
```
npm install
```
## Building Rust Modules
Navigate and build the Rust AES-256 module
```
cd aes-wasm
wasm-pack build --target web
```
Navigate and build the Rust Elliptic Curve Diffie-Hellman module
```
cd dh-wasm
wasm-pack build --target web
```

Navigate and build the Rust XEdDSA Module
```
cd xeddsa-wasm
wasm-pack build --target web
```

# References
[**Signal XEdDSA**](https://signal.org/docs/](https://signal.org/docs/specifications/xeddsa/))

[**RFC 8032 Ed25519**](https://signal.org/docs/](https://datatracker.ietf.org/doc/html/rfc8032)](https://datatracker.ietf.org/doc/html/rfc7748))

[**RFC 7748 Curve25519**](https://signal.org/docs/](https://datatracker.ietf.org/doc/html/rfc8032))
