import { Reader } from 'f-streams-async';

export interface IReader<T> {
    reader: Reader<T>;
    length: number;
}

export type DiagnoseSeverity = 'success' | 'info' | 'warning' | 'error';

export interface IDiagnose {
    severity: DiagnoseSeverity;
    message: string;
    code?: string;
    title?: string;
    detail?: string;
    stack?: string;
}
