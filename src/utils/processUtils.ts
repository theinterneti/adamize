/**
 * Process Utilities
 *
 * Wrapper functions for child_process to make testing easier.
 */

import { exec, spawn, ChildProcess, ExecOptions, SpawnOptions } from 'child_process';
import { promisify } from 'util';

// Promisify exec
const execPromise = promisify(exec);

/**
 * Execute a command and return the result
 * @param command Command to execute
 * @param options Execution options
 * @returns Promise with stdout and stderr
 */
export async function executeCommand(command: string, options?: ExecOptions): Promise<{ stdout: string; stderr: string }> {
  const result = await execPromise(command, options);
  return {
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString()
  };
}

/**
 * Spawn a new process
 * @param command Command to spawn
 * @param args Command arguments
 * @param options Spawn options
 * @returns Child process
 */
export function spawnProcess(command: string, args: string[], options: SpawnOptions = {}): ChildProcess {
  return spawn(command, args, options);
}

export default {
  executeCommand,
  spawnProcess
};
