export function costsFilter(value: number) {
    if (!value) { return ''; }
    // m
    if ( value >= 1e6 ) {
        return Math.round( value / 1e4 ) / 100 + 'M';
    }

    //if ( value >= 1e4 ) {
    return Math.round( value / 10 ) / 100 + 'k';
    //}

    //return `${Math.round(value * 100) / 100}`;
}

export function periodFilter(value: number) {
    if (!value) { return ''; }

    const y = Math.floor(value / (12 * 30) );
    const m = Math.floor(value % (12 * 30) / 30 );
    const d = Math.floor(value % 30);

    return `${ y ? y + 'Y ' : '' }${ m ? m + 'm ' : '' }${d}d`;
}
