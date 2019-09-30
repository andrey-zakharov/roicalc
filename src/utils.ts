export function costsFilter(value: number) {
    if (!value) { return ''; }
    // m
    const m = Math.floor(value / 1000000);
    const k  = Math.floor( value % 1000000 / 1000);
    const u = Math.floor(value % 1000);

    return `${ m ? m + 'M ' : '' }${ k ? k + 'k ' : '' }${u ? u : ''}`;
}

export function periodFilter(value: number) {
    if (!value) { return ''; }

    const y = Math.floor(value / (12 * 30) );
    const m = Math.floor(value % (12 * 30) / 30 );
    const d = Math.floor(value % 30);

    return `${ y ? y + 'Y ' : '' }${ m ? m + 'm ' : '' }${d}days`;
}
