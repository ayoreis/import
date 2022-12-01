/**
 * Adapted from https://github.com/stacktracejs/stackframe released under the following license:
 *
 * Copyright (c) 2017 Eric Wendelin and other contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const FIREFOX_SAFARI_STACK_REGEXP = /(^|@)\S+:\d+/;
const CHROME_IE_STACK_REGEXP = /^\s*at .*(\S+:\d+|\(native\))/m;
const SAFARI_NATIVE_CODE_REGEXP = /^(eval@)?(\[native code])?$/;

export class ErrorStackParser {
    public static parse (error: any){
        if (typeof error.stacktrace !== 'undefined' || typeof error['opera#sourceloc'] !== 'undefined') {
            return ErrorStackParser.parseOpera(error);
        } else if (error.stack && error.stack.match(CHROME_IE_STACK_REGEXP)) {
            return ErrorStackParser.parseV8OrIE(error);
        } else if (error.stack) {
            return ErrorStackParser.parseFFOrSafari(error);
        } else {
            throw new Error('Cannot parse given Error object');
        }
    }

    private static extractLocation(urlLike: any) {
        // Fail-fast but return locations like "(native)"
        if (urlLike.indexOf(':') === -1) {
            return [urlLike];
        }

        const regExp = /(.+?)(?::(\d+))?(?::(\d+))?$/;
        const parts = regExp.exec(urlLike.replace(/[()]/g, ''));
        if(parts !== null && parts.length>4){
            return [parts[1], parts[2] || undefined, parts[3] || undefined];
        }
        return []
    }
    private static parseV8OrIE(error: any) {
        const filtered = error.stack.split('\n').filter(function(line: any) {
            return !!line.match(CHROME_IE_STACK_REGEXP);
        }, this);

        return filtered.map(function(line: any) {
            if (line.indexOf('(eval ') > -1) {
                // Throw away eval information until we implement stacktrace.js/stackframe#8
                line = line.replace(/eval code/g, 'eval').replace(/(\(eval at [^()]*)|(,.*$)/g, '');
            }
            let sanitizedLine = line.replace(/^\s+/, '').replace(/\(eval code/g, '(').replace(/^.*?\s+/, '');

            // capture and preseve the parenthesized location "(/foo/my bar.js:12:87)" in
            // case it has spaces in it, as the string is split on \s+ later on
            const location = sanitizedLine.match(/ (\(.+\)$)/);

            // remove the parenthesized location from the line, if it was matched
            sanitizedLine = location ? sanitizedLine.replace(location[0], '') : sanitizedLine;

            // if a location was matched, pass it to extractLocation() otherwise pass all sanitizedLine
            // because this line doesn't have function name
            const locationParts = ErrorStackParser.extractLocation(location ? location[1] : sanitizedLine);
            const functionName = location && sanitizedLine || undefined;
            const fileName = ['eval', '<anonymous>'].indexOf(locationParts[0]) > -1 ? undefined : locationParts[0];

            return {
                functionName: functionName,
                fileName: fileName,
                lineNumber: locationParts[1],
                columnNumber: locationParts[2],
                source: line
            };
        }, this);
    }
    private static parseFFOrSafari(error: any) {
        const filtered = error.stack.split('\n').filter(function(line:any) {
            return !line.match(SAFARI_NATIVE_CODE_REGEXP);
        }, this);

        return filtered.map(function(line:any) {
            // Throw away eval information until we implement stacktrace.js/stackframe#8
            if (line.indexOf(' > eval') > -1) {
                line = line.replace(/ line (\d+)(?: > eval line \d+)* > eval:\d+:\d+/g, ':$1');
            }

            if (line.indexOf('@') === -1 && line.indexOf(':') === -1) {
                // Safari eval frames only have function names and nothing else
                return {
                    functionName: line
                };
            } else {
                const functionNameRegex = /((.*".+"[^@]*)?[^@]*)(?:@)/;
                const matches = line.match(functionNameRegex);
                const functionName = matches && matches[1] ? matches[1] : undefined;
                const locationParts = ErrorStackParser.extractLocation(line.replace(functionNameRegex, ''));

                return {
                    functionName: functionName,
                    fileName: locationParts[0],
                    lineNumber: locationParts[1],
                    columnNumber: locationParts[2],
                    source: line
                };
            }
        }, this);
    }
    private static parseOpera(e: any) {
        if (!e.stacktrace || (e.message.indexOf('\n') > -1 &&
            e.message.split('\n').length > e.stacktrace.split('\n').length)) {
            return this.parseOpera9(e);
        } else if (!e.stack) {
            return this.parseOpera10(e);
        } else {
            return this.parseOpera11(e);
        }
    }
    private static parseOpera9(e: any) {
        const lineRE = /Line (\d+).*script (?:in )?(\S+)/i;
        const lines = e.message.split('\n');
        const result = [];

        for (let i = 2, len = lines.length; i < len; i += 2) {
            const match = lineRE.exec(lines[i]);
            if (match) {
                result.push({
                    fileName: match[2],
                    lineNumber: match[1],
                    source: lines[i]
                });
            }
        }

        return result;
    }
    private static parseOpera10(e: any) {
        const lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i;
        const lines = e.stacktrace.split('\n');
        const result = [];

        for (let i = 0, len = lines.length; i < len; i += 2) {
            const match = lineRE.exec(lines[i]);
            if (match) {
                result.push(
                    {
                        functionName: match[3] || undefined,
                        fileName: match[2],
                        lineNumber: match[1],
                        source: lines[i]
                    }
                );
            }
        }

        return result;
    }
    private static parseOpera11(error: any) {
        const filtered = error.stack.split('\n').filter(function(line: any) {
            return !!line.match(FIREFOX_SAFARI_STACK_REGEXP) && !line.match(/^Error created at/);
        }, this);

        return filtered.map(function(line:any) {
            const tokens = line.split('@');
            const locationParts = ErrorStackParser.extractLocation(tokens.pop());
            const functionCall = (tokens.shift() || '');
            const functionName = functionCall
                .replace(/<anonymous function(: (\w+))?>/, '$2')
                .replace(/\([^)]*\)/g, '') || undefined;
            let argsRaw;
            if (functionCall.match(/\(([^)]*)\)/)) {
                argsRaw = functionCall.replace(/^[^(]+\(([^)]*)\)$/, '$1');
            }
            const args = (argsRaw === undefined || argsRaw === '[arguments not available]') ?
                undefined : argsRaw.split(',');

            return {
                functionName: functionName,
                args: args,
                fileName: locationParts[0],
                lineNumber: locationParts[1],
                columnNumber: locationParts[2],
                source: line
            };
        }, this);
    }
}
