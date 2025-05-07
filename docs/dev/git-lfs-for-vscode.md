# Git LFS for VS Code Extensions

This document explores the use of Git Large File Storage (LFS) for VS Code extensions, particularly in the context of the Adamize project with its plans for local LLM integration.

## What is Git LFS?

Git Large File Storage (LFS) is an extension to Git that replaces large files with text pointers inside Git, while storing the file contents on a remote server. This allows you to work with large files in your repository without bloating the repository size or slowing down Git operations.

## When to Use Git LFS for VS Code Extensions

VS Code extensions typically don't require Git LFS, as they are mostly code-based. However, there are scenarios where Git LFS becomes valuable:

1. **Local LLM Integration**: If your extension includes pre-trained models or model weights
2. **Large Test Fixtures**: For testing with realistic data
3. **Media Assets**: Icons, images, videos, or other media files
4. **Documentation Resources**: Large PDFs or other documentation files

## VS Code Extension Packaging Considerations

When using Git LFS with VS Code extensions, consider the following:

1. **Package Size Limits**: VS Code Marketplace has a 100MB limit for extension packages
2. **Distribution Strategy**: Decide whether large files should be:
   - Included in the extension package
   - Downloaded on-demand during extension activation
   - Stored externally and accessed via URLs

3. **Performance Impact**: Large files can slow down extension installation and activation

## Setting Up Git LFS for Adamize

### Installation

1. Install Git LFS:
   ```bash
   # For Ubuntu/Debian
   sudo apt-get install git-lfs
   
   # For macOS
   brew install git-lfs
   
   # For Windows
   # Download from https://git-lfs.github.com/
   ```

2. Initialize Git LFS:
   ```bash
   git lfs install
   ```

### Configuration

1. Track specific file patterns:
   ```bash
   # Track model files
   git lfs track "*.onnx"
   git lfs track "*.bin"
   git lfs track "*.pt"
   
   # Track large media files
   git lfs track "*.png" "*.jpg" "*.gif"
   git lfs track "*.mp4" "*.webm"
   
   # Track large data files
   git lfs track "*.json" "*.csv" "*.sqlite"
   ```

2. Add `.gitattributes` to version control:
   ```bash
   git add .gitattributes
   git commit -m "chore: configure Git LFS tracking"
   ```

## Best Practices for Adamize

### For Local LLM Integration

1. **Model Management**:
   - Store small models directly in the repository using Git LFS
   - For larger models, implement a download mechanism during first use
   - Consider using Hugging Face's model repositories for hosting

2. **Versioning Strategy**:
   - Version models separately from code
   - Use semantic versioning for models
   - Document model compatibility with extension versions

3. **Fallback Mechanisms**:
   - Implement fallbacks for when models can't be downloaded
   - Provide clear error messages and recovery options

### For VS Code Extension Packaging

1. **Selective Inclusion**:
   - Include only essential files in the VSIX package
   - Use `.vscodeignore` to exclude unnecessary files
   - Consider dynamic loading for large resources

2. **Optimizing Package Size**:
   - Compress resources where possible
   - Use quantized or optimized models
   - Split functionality into multiple extensions if necessary

3. **Documentation**:
   - Clearly document external dependencies
   - Provide setup instructions for users

## Example: Implementing On-Demand Downloads

For large LLM models that exceed VS Code Marketplace limits, implement on-demand downloading:

```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

export async function downloadModelIfNeeded(
  context: vscode.ExtensionContext,
  modelName: string,
  modelUrl: string
): Promise<string> {
  // Define model storage location
  const storagePath = context.globalStorageUri.fsPath;
  const modelPath = path.join(storagePath, modelName);
  
  // Check if model exists
  if (!fs.existsSync(modelPath)) {
    // Create progress notification
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Downloading ${modelName}...`,
        cancellable: true
      },
      async (progress, token) => {
        // Ensure directory exists
        if (!fs.existsSync(storagePath)) {
          fs.mkdirSync(storagePath, { recursive: true });
        }
        
        // Download file
        const response = await axios({
          method: 'GET',
          url: modelUrl,
          responseType: 'stream',
          onDownloadProgress: (progressEvent) => {
            const percentComplete = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            progress.report({ 
              message: `${percentComplete}%`,
              increment: percentComplete 
            });
          }
        });
        
        // Save to file
        const writer = fs.createWriteStream(modelPath);
        response.data.pipe(writer);
        
        return new Promise<void>((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
          token.onCancellationRequested(() => {
            writer.close();
            fs.unlinkSync(modelPath);
            reject(new Error('Download cancelled'));
          });
        });
      }
    );
  }
  
  return modelPath;
}
```

## Conclusion

Git LFS is a valuable tool for managing large files in the Adamize project, especially as you implement local LLM integration. By carefully planning your approach to large file management, you can maintain a clean repository while providing a smooth experience for users and contributors.
