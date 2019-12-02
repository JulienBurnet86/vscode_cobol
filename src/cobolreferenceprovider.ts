
import * as vscode from 'vscode';
import { VSCodeSourceHandler } from './VSCodeSourceHandler';
import COBOLQuickParse, { SourceReference, COBOLToken, SourceReferences } from './cobolquickparse';
import { VSCOBOLConfiguration } from './configuration';
import VSQuickCOBOLParse from './vscobolquickparse';
import { expandLogicalCopyBookToFilenameOrEmpty } from './opencopybook';
import { logCOBOLChannelLineException } from './extension';
import { FileSourceHandler } from './FileSourceHandler';

const wordRegEx: RegExp = new RegExp('[#0-9a-zA-Z][a-zA-Z0-9-_]*');

export class CobolReferenceProvider implements vscode.ReferenceProvider {
    private files: vscode.Uri[] = [];

    public provideReferences(
        document: vscode.TextDocument, position: vscode.Position,
        options: { includeDeclaration: boolean }, token: vscode.CancellationToken):
        Thenable<vscode.Location[] | null> {


        return this.processSearch(document, position);
    }

    private processSearch(
        document: vscode.TextDocument,
        position: vscode.Position): Thenable<vscode.Location[] | null> {
        let list: vscode.Location[] = [];
        let wordRange = document.getWordRangeAtPosition(position, wordRegEx);
        let word = wordRange ? document.getText(wordRange) : '';
        if (word === "") {
            return Promise.resolve(null);
        }

        let workLower = word.toLocaleLowerCase();

        let file = new VSCodeSourceHandler(document, false);
        let sourceRefs: SourceReferences = new SourceReferences();
        let qps: COBOLQuickParse[] = [];
        let top_qp = new COBOLQuickParse(file, document.fileName, VSCOBOLConfiguration.get(), "", sourceRefs);
        qps.push(top_qp);
        for (let [key, value] of top_qp.copyBooksUsed) {
            try {
                let fileName = expandLogicalCopyBookToFilenameOrEmpty(key);
                if (fileName.length > 0) {
                    let qfile = new FileSourceHandler(fileName, false);
                    qps.push(new COBOLQuickParse(qfile, fileName, VSCOBOLConfiguration.get(), "", sourceRefs));
                }
            }
            catch (e) {
                logCOBOLChannelLineException("processSearch", e);
            }
        }

        for (let qpos = 0; qpos < qps.length; qpos++) {
            let qp = qps[qpos];

            if (qp.paragraphs.has(workLower) || qp.sections.has(workLower)) {
                let paraToken: COBOLToken | undefined = qp.paragraphs.get(workLower);
                if (paraToken !== undefined) {
                    let qpsUrl: vscode.Uri = vscode.Uri.file(paraToken.filename);
                    list.push(new vscode.Location(qpsUrl, new vscode.Position(paraToken.startLine, paraToken.startColumn)));
                }

                let sectionToken: COBOLToken | undefined = qp.sections.get(workLower);
                if (sectionToken !== undefined) {
                    let qpsUrl: vscode.Uri = vscode.Uri.file(sectionToken.filename);
                    list.push(new vscode.Location(qpsUrl, new vscode.Position(sectionToken.startLine, sectionToken.startColumn)));
                }
            }

            if (qp.constantsOrVariables.has(workLower)) {
                let paraTokens: COBOLToken[] | undefined = qp.constantsOrVariables.get(workLower);
                if (paraTokens !== undefined) {
                    for (let ptref = 0; ptref < paraTokens.length; ptref++) {
                        let paraToken = paraTokens[ptref];
                        let qpsUrl: vscode.Uri = vscode.Uri.file(paraToken.filename);
                        list.push(new vscode.Location(qpsUrl, new vscode.Position(paraToken.startLine, paraToken.startColumn)));
                    }
                }
            }
        }

        if (sourceRefs.targetReferences.has(workLower) === true) {
            let targetRefs: SourceReference[] | undefined = sourceRefs.targetReferences.get(workLower);
            if (targetRefs !== undefined) {
                for (let trpos = 0; trpos < targetRefs.length; trpos++) {
                    let tref = targetRefs[trpos];
                    list.push(new vscode.Location(sourceRefs.filenames[tref.fileIdentifer], new vscode.Position(tref.line, tref.columnn)));
                }
            }
        }

        if (sourceRefs.constantsOrVariablesReferences.has(workLower) === true) {
            let targetRefs: SourceReference[] | undefined = sourceRefs.constantsOrVariablesReferences.get(workLower);
            if (targetRefs !== undefined) {
                for (let trpos = 0; trpos < targetRefs.length; trpos++) {
                    let tref = targetRefs[trpos];
                    list.push(new vscode.Location(sourceRefs.filenames[tref.fileIdentifer], new vscode.Position(tref.line, tref.columnn)));
                }
            }
        }


        if (list.length > 0) {
            return Promise.resolve(list);
        }
        else {
            return Promise.resolve(null);
        }
    }

}