import * as fs from 'fs';
import * as path from 'path';
import { isFile, logMessage } from "./extension";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const lzjs = require('lzjs');
import { COBOLFileSymbol, globalSymbolFilename, InMemoryGlobalSymbolCache, COBOLGlobalSymbolTable, reviver, fileSymbolFilename, InMemoryGlobalFileCache, COBOLGlobalFileTable, replacer } from './cobolglobalcache';

export class InMemoryGlobalCachesHelper {

    public static loadInMemoryGlobalSymbolCaches(cacheDirectory: string): boolean {
        //let symbolDir = COBOLSymbolTableHelper.getCacheDirectory();
        const fn: string = path.join(cacheDirectory, globalSymbolFilename);
        if (isFile(fn)) {
            const stat4cache: fs.Stats = fs.statSync(fn);
            if (stat4cache.mtimeMs !== InMemoryGlobalSymbolCache.lastModifiedTime) {
                try {

                    const str: string = fs.readFileSync(fn).toString();
                    const cachableTable: COBOLGlobalSymbolTable = JSON.parse(lzjs.decompress(str), reviver);
                    InMemoryGlobalSymbolCache.callableSymbols = cachableTable.callableSymbols;
                    InMemoryGlobalSymbolCache.lastModifiedTime = stat4cache.mtimeMs;
                    InMemoryGlobalSymbolCache.isDirty = false;
                    return true;
                }
                catch (e) {
                    fs.unlinkSync(fn);
                    return false;
                }
            }
        }
        return false;
    }


    public static loadInMemoryGlobalFileCache(cacheDirectory: string): boolean {
        const fn: string = path.join(cacheDirectory, fileSymbolFilename);

        if (isFile(fn)) {
            const stat4cache: fs.Stats = fs.statSync(fn);
            if (stat4cache.mtimeMs !== InMemoryGlobalFileCache.lastModifiedTime) {
                try {

                    const str: string = fs.readFileSync(fn).toString();
                    try {
                        const cachableTable: COBOLGlobalFileTable = JSON.parse(lzjs.decompress(str), reviver);
                        InMemoryGlobalFileCache.copybookFileSymbols = cachableTable.copybookFileSymbols;
                        InMemoryGlobalFileCache.lastModifiedTime = stat4cache.mtimeMs;
                        InMemoryGlobalFileCache.isDirty = false;
                    } catch {
                        fs.unlinkSync(fn);
                        logMessage(` Removing cache file ${fn}`);
                        return false;
                    }
                    return true;
                }
                catch (e) {
                    fs.unlinkSync(fn);
                    return false;
                }
            }
        }
        return false;
    }


    public static saveInMemoryGlobalCaches(cacheDirectory: string): void {

        if (InMemoryGlobalSymbolCache.isDirty) {
            const fnGlobalSymbolFilename: string = path.join(cacheDirectory, globalSymbolFilename);
            fs.writeFileSync(fnGlobalSymbolFilename, lzjs.compress(JSON.stringify(InMemoryGlobalSymbolCache, replacer)));
            InMemoryGlobalSymbolCache.isDirty = false;
        }

        if (InMemoryGlobalFileCache.isDirty) {
            const fnFileSymbolFilename: string = path.join(cacheDirectory, fileSymbolFilename);
            fs.writeFileSync(fnFileSymbolFilename, lzjs.compress(JSON.stringify(InMemoryGlobalFileCache, replacer)));
            InMemoryGlobalFileCache.isDirty = false;
        }
    }


    private static addSymbolToCache(srcfilename: string, symbolUnchanged: string, lineNumber: number, symbolsCache: Map<string, COBOLFileSymbol[]>) {
        const symbol = symbolUnchanged.toLowerCase();
        if (symbolsCache.has(symbol)) {
            const symbolList: COBOLFileSymbol[] | undefined = symbolsCache.get(symbol);

            /* search the list of COBOLFileSymbols */
            if (symbolList !== undefined) {
                let found = false;
                for (let i = 0; i < symbolList.length; i++) {
                    if (symbolList[i].filename === srcfilename && symbolList[i].lnum === lineNumber) {
                        found = true;
                        break;
                    }
                }
                // not found?
                if (found === false) {
                    symbolList.push(new COBOLFileSymbol(srcfilename, lineNumber));
                    InMemoryGlobalSymbolCache.isDirty = true;
                }
            }
        }
        const symbolList = [];
        symbolList.push(new COBOLFileSymbol(srcfilename, lineNumber));
        symbolsCache.set(symbol, symbolList);
        InMemoryGlobalSymbolCache.isDirty = true;
        return;
    }


    private static addSymbolFileToCache(srcfilename: string, symbolsCache: Map<string, COBOLFileSymbol[]>) {
        const symbol: string = srcfilename, lineNumber = 0;
        if (symbolsCache.has(symbol)) {
            const symbolList: COBOLFileSymbol[] | undefined = symbolsCache.get(symbol);

            /* search the list of COBOLFileSymbols */
            if (symbolList !== undefined) {
                let found = false;
                for (let i = 0; i < symbolList.length; i++) {
                    if (symbolList[i].filename === srcfilename && symbolList[i].lnum === lineNumber) {
                        found = true;
                        break;
                    }
                }
                // not found?
                if (found === false) {
                    symbolList.push(new COBOLFileSymbol(srcfilename, lineNumber));
                    InMemoryGlobalFileCache.isDirty = true;
                }
            }
        }
        const symbolList = [];
        symbolList.push(new COBOLFileSymbol(srcfilename, lineNumber));
        symbolsCache.set(symbol, symbolList);
        InMemoryGlobalFileCache.isDirty = true;
        return;
    }


    public static addClassSymbol(srcfilename: string, symbolUnchanged: string, lineNumber: number): void {
        const symbolsCache = InMemoryGlobalSymbolCache.classSymbols;

        InMemoryGlobalCachesHelper.addSymbolToCache(srcfilename, symbolUnchanged, lineNumber, symbolsCache);
    }


    public static addMethodSymbol(srcfilename: string, symbolUnchanged: string, lineNumber: number): void {
        const symbolsCache = InMemoryGlobalSymbolCache.methodSymbols;
        InMemoryGlobalCachesHelper.addSymbolToCache(srcfilename, symbolUnchanged, lineNumber, symbolsCache);
    }


    public static addSymbol(srcfilename: string, symbolUnchanged: string, lineNumber: number): void {
        const symbolsCache = InMemoryGlobalSymbolCache.callableSymbols;
        InMemoryGlobalCachesHelper.addSymbolToCache(srcfilename, symbolUnchanged, lineNumber, symbolsCache);
    }


    public static addCopyBookFilename(srcfilename: string): void {
        const symbolsCache = InMemoryGlobalFileCache.copybookFileSymbols;
        InMemoryGlobalCachesHelper.addSymbolFileToCache(srcfilename, symbolsCache);
    }


    public static getGlobalSymbolCache(): COBOLGlobalSymbolTable {
        return InMemoryGlobalSymbolCache;
    }
}
