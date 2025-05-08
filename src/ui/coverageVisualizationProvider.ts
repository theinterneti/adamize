/**
 * Coverage Visualization Provider
 * 
 * This file contains the implementation of the coverage visualization provider.
 * It provides decorations for uncovered code in the editor.
 * 
 * @module coverageVisualizationProvider
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Coverage data interface
 */
interface CoverageData {
  [key: string]: {
    path: string;
    statementMap: {
      [key: string]: {
        start: { line: number; column: number };
        end: { line: number; column: number };
      };
    };
    fnMap: {
      [key: string]: {
        name: string;
        line: number;
        loc?: {
          start: { line: number; column: number };
          end: { line: number; column: number };
        };
      };
    };
    branchMap: {
      [key: string]: {
        type: string;
        line: number;
        loc?: {
          start: { line: number; column: number };
          end: { line: number; column: number };
        };
        locations: Array<{
          start: { line: number; column: number };
          end: { line: number; column: number };
        }>;
      };
    };
    s: { [key: string]: number };
    f: { [key: string]: number };
    b: { [key: string]: Array<number> };
  };
}

/**
 * Coverage Visualization Provider
 */
export class CoverageVisualizationProvider implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly uncoveredLineDecorationType: vscode.TextEditorDecorationType;
  private readonly uncoveredStatementDecorationType: vscode.TextEditorDecorationType;
  private readonly uncoveredFunctionDecorationType: vscode.TextEditorDecorationType;
  private readonly uncoveredBranchDecorationType: vscode.TextEditorDecorationType;
  private coverageData: CoverageData | null = null;

  /**
   * Constructor
   * 
   * @param context VS Code extension context
   */
  constructor(private readonly context: vscode.ExtensionContext) {
    // Create decoration types
    this.uncoveredLineDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 0, 0, 0.1)',
      isWholeLine: true,
      overviewRulerColor: 'rgba(255, 0, 0, 0.5)',
      overviewRulerLane: vscode.OverviewRulerLane.Right
    });

    this.uncoveredStatementDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 0, 0, 0.2)',
      overviewRulerColor: 'rgba(255, 0, 0, 0.5)',
      overviewRulerLane: vscode.OverviewRulerLane.Right
    });

    this.uncoveredFunctionDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 165, 0, 0.2)',
      overviewRulerColor: 'rgba(255, 165, 0, 0.5)',
      overviewRulerLane: vscode.OverviewRulerLane.Right
    });

    this.uncoveredBranchDecorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 255, 0, 0.2)',
      overviewRulerColor: 'rgba(255, 255, 0, 0.5)',
      overviewRulerLane: vscode.OverviewRulerLane.Right
    });

    // Register event handlers
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
          this.updateDecorations(editor);
        }
      }),
      vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
          this.updateDecorations(editor);
        }
      }),
      vscode.commands.registerCommand('adamize.loadCoverageData', () => this.loadCoverageData()),
      vscode.commands.registerCommand('adamize.clearCoverageData', () => this.clearCoverageData()),
      vscode.commands.registerCommand('adamize.generateTestForUncovered', () => this.generateTestForUncovered())
    );

    // Add decoration types to disposables
    this.disposables.push(
      this.uncoveredLineDecorationType,
      this.uncoveredStatementDecorationType,
      this.uncoveredFunctionDecorationType,
      this.uncoveredBranchDecorationType
    );

    // Try to load coverage data
    this.loadCoverageData();
  }

  /**
   * Load coverage data from file
   */
  public async loadCoverageData(): Promise<void> {
    try {
      const coverageDir = path.join(this.context.extensionPath, 'coverage');
      const coverageFilePath = path.join(coverageDir, 'coverage-final.json');

      if (!fs.existsSync(coverageFilePath)) {
        // Run coverage tests if coverage data doesn't exist
        const runCoverage = await vscode.window.showInformationMessage(
          'No coverage data found. Run coverage tests?',
          'Yes', 'No'
        );

        if (runCoverage === 'Yes') {
          await vscode.commands.executeCommand('adamize.runTestsWithCoverage');
          // Wait for coverage data to be generated
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          return;
        }
      }

      // Load coverage data
      const coverageData = JSON.parse(fs.readFileSync(coverageFilePath, 'utf8'));
      this.coverageData = coverageData;

      // Update decorations for active editor
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        this.updateDecorations(editor);
      }

      vscode.window.showInformationMessage('Coverage data loaded successfully');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load coverage data: ${error}`);
    }
  }

  /**
   * Clear coverage data
   */
  public clearCoverageData(): void {
    this.coverageData = null;

    // Clear decorations for active editor
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      editor.setDecorations(this.uncoveredLineDecorationType, []);
      editor.setDecorations(this.uncoveredStatementDecorationType, []);
      editor.setDecorations(this.uncoveredFunctionDecorationType, []);
      editor.setDecorations(this.uncoveredBranchDecorationType, []);
    }

    vscode.window.showInformationMessage('Coverage data cleared');
  }

  /**
   * Generate test for uncovered code
   */
  public async generateTestForUncovered(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const filePath = editor.document.uri.fsPath;
    const selection = editor.selection;

    // Check if the selection is in an uncovered area
    if (this.isUncoveredArea(filePath, selection.start.line)) {
      // Generate test for the selected area
      await vscode.commands.executeCommand('adamize.generateTestForSelection');
    } else {
      vscode.window.showInformationMessage('Selected area is already covered by tests');
    }
  }

  /**
   * Check if a line is in an uncovered area
   * 
   * @param filePath File path
   * @param line Line number
   * @returns True if the line is in an uncovered area
   */
  private isUncoveredArea(filePath: string, line: number): boolean {
    if (!this.coverageData) {
      return false;
    }

    // Normalize file path
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Find coverage data for the file
    const fileData = Object.values(this.coverageData).find(data => {
      return normalizedPath.endsWith(data.path);
    });

    if (!fileData) {
      return false;
    }

    // Check if the line is uncovered
    for (const statementId in fileData.statementMap) {
      const statement = fileData.statementMap[statementId];
      if (statement.start.line <= line && statement.end.line >= line) {
        if (fileData.s[statementId] === 0) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Update decorations for the editor
   * 
   * @param editor Text editor
   */
  private updateDecorations(editor: vscode.TextEditor): void {
    if (!this.coverageData) {
      return;
    }

    const filePath = editor.document.uri.fsPath;
    
    // Normalize file path
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Find coverage data for the file
    const fileData = Object.values(this.coverageData).find(data => {
      return normalizedPath.endsWith(data.path);
    });

    if (!fileData) {
      return;
    }

    // Create decorations for uncovered statements
    const uncoveredStatements: vscode.DecorationOptions[] = [];
    for (const statementId in fileData.statementMap) {
      if (fileData.s[statementId] === 0) {
        const statement = fileData.statementMap[statementId];
        const range = new vscode.Range(
          statement.start.line - 1, statement.start.column,
          statement.end.line - 1, statement.end.column
        );
        uncoveredStatements.push({ range });
      }
    }

    // Create decorations for uncovered functions
    const uncoveredFunctions: vscode.DecorationOptions[] = [];
    for (const functionId in fileData.fnMap) {
      if (fileData.f[functionId] === 0) {
        const func = fileData.fnMap[functionId];
        if (func.loc) {
          const range = new vscode.Range(
            func.loc.start.line - 1, func.loc.start.column,
            func.loc.end.line - 1, func.loc.end.column
          );
          uncoveredFunctions.push({ range });
        }
      }
    }

    // Create decorations for uncovered branches
    const uncoveredBranches: vscode.DecorationOptions[] = [];
    for (const branchId in fileData.branchMap) {
      const branch = fileData.branchMap[branchId];
      const branchCoverage = fileData.b[branchId];
      
      for (let i = 0; i < branchCoverage.length; i++) {
        if (branchCoverage[i] === 0 && branch.locations[i]) {
          const location = branch.locations[i];
          const range = new vscode.Range(
            location.start.line - 1, location.start.column,
            location.end.line - 1, location.end.column
          );
          uncoveredBranches.push({ range });
        }
      }
    }

    // Set decorations
    editor.setDecorations(this.uncoveredStatementDecorationType, uncoveredStatements);
    editor.setDecorations(this.uncoveredFunctionDecorationType, uncoveredFunctions);
    editor.setDecorations(this.uncoveredBranchDecorationType, uncoveredBranches);
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
