<h1 align="center">
  <picture>
    <!-- Dark mode logo -->
    <source 
      srcset="echo-logo-text.png" 
      media="(prefers-color-scheme: dark)"
      width="300" 
      height="100"
    >
    <!-- Light mode logo -->
    <img 
      srcset="echo-logo-text.png" 
      media="(prefers-color-scheme: dark)"
      width="300" 
      height="100"
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
  - [AEAD AES-256 (Authenticated Encryption with Associated Data)](#aead-aes-256-authenticated-encryption-with-associated-data) 
  - [X3DH (Extended Triple Diffie-Hellman)](#x3dh-extended-triple-diffie-hellman)  
  - [XEdDSA (EdDSA for X25519)](#xeddsa-eddsa-for-x25519)
  - [XEdDSA Signing](#xeddsa-signing)
  - [XEdDSA Verification](#xeddsa-verification)  
  - [Double Ratchet Algorithm ](#double-ratchet-algorithm) 
- [Setup](#setup)
- [Running](#running)  
- [References](#references)  

<h1 align="center">
    <img src="EchoProtocolLogo.png" width="400" alt="Echo Protocol Logo">
</h1>

The cryptographic primitives are built in Rust and compiled into javascrypt using WASM. [Echo-Protocol](https://github.com/Pringles505/Echo-Protocol) can be installed using:

``` npm install @mascaro101/echo-protocol ```

## **AEAD AES-256 (Authenticated Encryption with Associated Data)**

AEAD AES‑256 provides **confidentiality, integrity, and authenticity**
for encrypted messages.

Later we will use AEAD AES-256 alongside the Double Ratchet algorithm to
encrypt each message using a **unique message key (`MK`)** derived from
the ratchet chain.

## **Core Components**
  `AES‑256`                      Symmetric block cipher using a 256‑bit key
  `Nonce`                        Unique value used once per encryption operation
  `Ciphertext`                   Encrypted output of the plaintext
  `Authentication Tag`           Integrity check generated during encryption
  `AAD`                          Associated data authenticated but not encrypted (e.g., message headers)

## **Encryption Process**

-   `MK`  message key (256‑bit)
-   `Nonce`   unique 96‑bit value
-   `Plaintext`   message content
-   `AAD`   optional associated data

Encryption is performed as:

    ciphertext, tag = AES256_GCM_Encrypt(MK, Nonce, plaintext, AAD)

The result consists of:

    message = {
        nonce,
        ciphertext,
        tag
    }

The `AAD` is not encrypted but is included in the authentication
calculation.

## **Decryption Process**

Upon receiving a message:

    plaintext = AES256_GCM_Decrypt(MK, Nonce, ciphertext, tag, AAD)

If authentication fails:

-   the message is **rejected**
-   no plaintext is returned

This ensures that any tampering with the ciphertext or associated data
is detected.

## **Nonce Requirements**

A nonce **must never be reused with the same key**.

Typical construction:

    Nonce = message_counter || random_bytes

In ratcheted messaging systems, the nonce can be derived from the
**message number (`n`)** to guarantee uniqueness.


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

``Encoding`` For storing points, usually 64 bytes, 32 bytes for $X$ and $Y$. We can compress this by dropping the $X$ and adding a bit to represent the sign for $X$. This helps with transmission. The $X$ is recalculated later.

`SHA-512` is a hashing algorithm used to convert text of any size into a fixed-size string.

`Scalar Multiplication` in the context of Elliptic Curve Cryptography, is the repeated addition of a point on the curve to itself, this is the keystone in ECC

`Clamping` is the process by which the keys are adjusted by byte, preventing certain subgroup attacks and from foreign malicious public key attacks.
| Byte Index | Description             | Operation                       | Bit Constraint Result             | Purpose                                                  |
|------------|-------------------------|----------------------------------|-----------------------------------|----------------------------------------------------------|
| 0          | Least significant byte  | `a[0] &= 248`                    | Clears bits 0, 1, 2               | Ensures scalar is a multiple of 8    |
| 1–30       | Middle bytes            | —                                | No change                         | Retains entropy for randomness                          |
| 31         | Most significant byte   | `a[31] &= 127; a[31] = 64`      | Clears bit 255, sets bit 254      | Ensures scalar is between 2²⁵⁴ and 2²⁵⁵−1 for security   |


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


### XEdDSA Signing
1. **Initial Key Conversion**:
   Initially an XEdDSA key is computed by running the `xprivIK` through SHA-512. This outputs a 64 byte array, the first 32 bytes are `clamped` and become `a`. The last 32 bytes become the `Prefix`
     
2. **Compute Deterministic Nonce**:

   $r = SHA(Prefix + message) % L$

    We will pass `xpubPK` as the message to compute the nonce, this will effectively `sign` the PreKey. We perform $mod L$ to keep the nonce within the valid scalar range.
   
3. **Compute Nonce Point**:

   $R = B ⋅ r$

   The Nonce point is computed by performing a `Scalar Multiplcation` between the `nonce` and the `Basepoint`. This is then `encoded` into 32 bytes, to only store the $Y$ and a sign bit for $X$ coordinate of the Nonce point.

4. **Recompute Public Key in Edwards Form**:

   Similarly as in the initial key conversion, the `xprivIK` is ran through SHA-512 and the first 32 bytes are `clamped`. Then a `Scalar Multiplication` is with the `Basepoint` to compute the publicIK in Edwards form. This is then       
   `encoded`.

5. **Compute Challenge Hash**

   $k = SHA(R + A + message) % L$

   The challenge hash is computed with `xpubPK` as the message as was done in the calcuation for the `Nonce Point`, and $mod L$ is performed to keep the scalar within valid range.

6. **Compute Signature Scalar**

    $S = (r + k + a)$

   The Signature Scalar is a concatenation of the `nonce`, `challenge hash` and `PrivateKey` in Edwards form

7. **Computing Signature**

   $Signature = (R + S)$

   The final signature is a concatenation of the `Nonce Point`

### XEdDSA Verification

To verify a signature, the verifier must follow these steps:

1. **Decompress Inputs:**
   - Extract the components `R` and `S` from the received signature.
   - Convert the received public key (`A`) back into Edwards form if it’s stored in compressed format.

2. **Compute Challenge Hash:**
   
   $k = SHA(R + A + message) % L$

3. **Compute signature:**

    $S * B == R + k * A$

4. **Verify signature**

    The signature is then compared with the given signature. In the case it matches it's authorized


## **Double Ratchet Algorithm**

The Double Ratchet Algorithm is a **stateful key evolution protocol**
used to provide secure messaging after an initial shared secret has been
established (through **X3DH**). It ensures:

-   **Forward Secrecy** -- past messages remain secure if current keys
    are compromised.\
-   **Post-Compromise Security** -- security can recover after a
    compromise once a new Diffie-Hellman exchange occurs.\
-   **Message Confidentiality and Integrity** through continuously
    evolving keys.

------------------------------------------------------------------------

### **Ratchet State**

Each participant maintains a ratchet state containing:

  Variable   Description
  ---------- --------------------------------------------------------
  `RK`       Root Key -- master key used to derive chain keys
  `CKs`      Sending Chain Key
  `CKr`      Receiving Chain Key
  `DHs`      Local Diffie-Hellman key pair
  `DHr`      Remote Diffie-Hellman public key
  `Ns`       Number of messages sent in current sending chain
  `Nr`       Number of messages received in current receiving chain
  `PN`       Number of messages in the previous sending chain

------------------------------------------------------------------------

## **Key Derivation**

All key updates rely on a **Key Derivation Function (KDF)**.

Two KDF chains are used:

### **Root Key Derivation**

When a new Diffie-Hellman exchange occurs:

    RK, CK = KDF_RK(RK, DH(DHs, DHr))

Where:

-   `RK` becomes the updated root key
-   `CK` becomes a new chain key

------------------------------------------------------------------------

### **Message Key Derivation**

For every message sent or received:

    CK, MK = KDF_CK(CK)

Where:

-   `CK` becomes the next chain key
-   `MK` is the message encryption key

------------------------------------------------------------------------

## **Algorithm Workflow**

### **1. Initial State**

After **X3DH** establishes the initial shared secret:

    RK = SK
    DHs = generate_DH_keypair()
    DHr = received_DH_key
    CKs = CKr = null
    Ns = 0
    Nr = 0
    PN = 0

The first sending chain is derived:

    RK, CKs = KDF_RK(RK, DH(DHs, DHr))

------------------------------------------------------------------------

## **Sending a Message**

When Alice sends a message:

### **1. Derive Message Key**

    CKs, MK = KDF_CK(CKs)

### **2. Encrypt Message**

    ciphertext = AEAD_Encrypt(MK, plaintext)

### **3. Construct Header**

The message header contains:

    header = {
        dh: DHs_public,
        pn: PN,
        n: Ns
    }

### **4. Update Counter**

    Ns += 1

------------------------------------------------------------------------

## **Receiving a Message**

When Bob receives a message:

### **1. Check for New DH Key**

If the received `dh` differs from `DHr`, perform a **DH Ratchet Step**.

------------------------------------------------------------------------

## **Diffie-Hellman Ratchet Step**

When a new public key appears:

### **1. Update Counters**

    PN = Ns
    Ns = 0
    Nr = 0

### **2. Update Receiving Chain**

    DHr = received_dh
    RK, CKr = KDF_RK(RK, DH(DHs, DHr))

### **3. Generate New DH Key Pair**

    DHs = generate_DH_keypair()

### **4. Update Sending Chain**

    RK, CKs = KDF_RK(RK, DH(DHs, DHr))

This step **re-establishes cryptographic freshness**.

------------------------------------------------------------------------

## **Decrypting Messages**

Once the correct receiving chain key is established:

### **1. Derive Message Key**

    CKr, MK = KDF_CK(CKr)

### **2. Decrypt**

    plaintext = AEAD_Decrypt(MK, ciphertext)

### **3. Update Counter**

    Nr += 1

------------------------------------------------------------------------

## **Handling Out-of-Order Messages**

Messages may arrive out of order due to network conditions.

To handle this, the algorithm stores **skipped message keys**:

    MKSKIPPED[(dh, n)] = MK

If a delayed message arrives later, the stored key can decrypt it
without breaking the ratchet state.

------------------------------------------------------------------------

# Setup

Install [**Rust**](https://rustup.rs/) with Rustup

Install `Echo-Protocol` if needed
```bash
npm install @mascaro101/echo-protocol
```

Install Dependencies
```
npm install
```

# Running

Run on the web
```
npm run dev
```

Run desktop app
```
npm run tauri dev
```

# References
[**Signal XEdDSA**](https://signal.org/docs/](https://signal.org/docs/specifications/xeddsa/))

[**RFC 8032 Ed25519**](https://signal.org/docs/](https://datatracker.ietf.org/doc/html/rfc8032)](https://datatracker.ietf.org/doc/html/rfc7748))

[**RFC 7748 Curve25519**](https://signal.org/docs/](https://datatracker.ietf.org/doc/html/rfc8032))
