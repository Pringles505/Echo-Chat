
export function level(x) {
    if((x & 1) === 0) return 0;
    let k = 0;
    while(((x >> k) & 1) === 1)k++;
    return k;
}

export function nodeWidth(n){
    if (n === 0) return 0;
    return 2*n -1;
}

export function root(n){
    const w = 2 * n - 1;
    return (1 << Math.floor(Math.log2(w))) - 1;
}

export function left(x){
    const k = level(x);
    if (k === 0) throw new RangeError("Leaves have no children");
    return x ^ (1 << (k - 1));
}

export function right(x){
    const k = level(x);
    if (k === 0) throw new RangeError("Leaves have no children");
    return x ^ (3 << (k - 1));
}

function parentStep(x){
    const k = level(x);
    const b = (x >> (k + 1)) & 1;
    return (x | (1 << k)) ^ (b << (k + 1));
}

export function parent(x, n){
    if (x === root(n)) return x;
    let p = parentStep(x);
    while(p >= nodeWidth(n)) p = parentStep(p);
    return p;
}

export function sibling(x, n){
    const p = parent(x, n);
    if (p === x) return x;
    return x < p ? right(p): left(p);
}

export function directPath(x, n){
    const r = root(n);
    if (x === r) return [];
    const path = [];
    let current = parent(x, n);
    while(true){
        path.push(current);
        if (current === r) break;
        current = parent(current, n);
    }
    return path;
}

export function copath(x, n){
    const fullPath = [x, ...directPath(x, n)];
    return fullPath.slice(0, -1).map(node => sibling(node, n));
}

export function resolution(nodes, x, n){
    const w = nodeWidth(n);

    // Virtual Node
    if(x >= w) {
        if (level(x) === 0) return [];
        return[
            ...resolution(nodes, left(x), n),
            ...resolution(nodes, right(x), n),
        ];
    }

    // Non-Blank real node
    if (nodes[x]?.publicKeyB64) return [x];

    // Blank real leaf
    if(level(x) === 0) return [];

    // Blank real internal node
    return [
        ...resolution(nodes, left(x), n),
        ...resolution(nodes, right(x), n),
    ];
}

export function leafNode(k){
    return 2 * k;
}