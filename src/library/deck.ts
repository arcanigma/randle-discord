export type Script = {
    event?: string;
    requireModerator?: Option;
    limit?: Value;
    dealFirst?: Items;
    deal?: Items;
    dealLast?: Items;
    rules?: Rules;
    import?: string | string[];
} & Defines;

export type Defines = {
    sets?: SetDefines;
    values?: ValueDefines;
    options?: OptionDefines;
}

export type SetDefines = { [name: string]: Set }

export type ValueDefines = { [name: string]: Value }

export type OptionDefines = { [name: string]: Option }

export type Set =
    | string[]
    | string
    | { union: Set[] }
    | { intersect: Set[] }
    | { except: Set[] }

export type Value =
    | number
    | string
    | { plus: Value[] }
    | { minus: Value[] }
    | { times: Value[] }
    | { max: Value[] }
    | { min: Value[] }
    // TODO add a lookup for the number of members dealt to

export type Option =
    | boolean
    | string
    | { and: Option[] }
    | { or: Option[] }
    | { not: Option }

export type Items =
    | string
    | { choose: Value; from: Items }
    | { choose: Value; grouping: Items[] }
    | { repeat: Value; from: Items }
    | { repeat: Value; grouping: Items[] }
    | { duplicate: Value; of?: Value; from: Items }
    | { cross: Items; with: Items; using?: string }
    | { zip: Items; with: Items; using?: string }
    | { if: Option; then: Items; else?: Items }
    | { set: Set; union?: Set; intersect?: Set; except?: Set }
    | Items[]

export type Rules =
    | ShowRule
    | AnnounceRule
    | ExplainRule
    | Rules[]

export type ShowRule = {
    show: Matcher;
    to: Matcher;
    as?: string;
    distinctive?: Option;
} & Conditional

export type AnnounceRule = {
    announce: Matcher;
    as?: string;
} & Conditional

export type ExplainRule = {
    explain: string;
    as: string;
} & Conditional

// TODO GraphRule

// TODO RelayRule and RelayService

export type Conditional = {
    if?: Option;
    ifIncluded?: string | string[];
    ifExcluded?: string | string[];
}

export type Matcher =
    | string
    | { is: string }
    | { isNot: string }
    | { startsWith: string }
    | { startsWithout: string }
    | { endsWith: string }
    | { endsWithout: string }
    | { includes: string }
    | { excludes: string }
    | { matches: string }
    | { all: true }
    | { set: Set; union?: Set; intersect?: Set; except?: Set }
    | Matcher[]