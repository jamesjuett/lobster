export interface ASTNode {
    readonly source: {
        readonly start: number;
        readonly end: number;
        readonly text: string;
        readonly line: number;
        readonly column: number;
    };
    readonly library_id?: number;
    readonly library_unsupported?: boolean;
}
export interface AnythingConstructASTNode extends ASTNode {
    readonly construct_type: "anything_construct";
}
