/* eslint-disable @typescript-eslint/no-empty-function */
import { Spinner } from 'cli-spinner';

export function spinnerStart(message: string, loading = '|/-\\') {
  const spinner = new Spinner(message + '%s');
  spinner.setSpinnerString(loading);
  spinner.start();
  return spinner;
}

export function sleep(timer = 1000) {
  return new Promise((resolve) => setTimeout(resolve, timer));
}

export interface HooksProps {
  pre?: () => void;
  after?: () => void;
  final?: () => void;
}

export async function doSpinner(
  message: string,
  callback = () => {},
  hooks: HooksProps = {},
  loading = '|/-\\',
) {
  const { pre = () => {}, after = () => {}, final = () => {} } = hooks;
  const spinner = spinnerStart(message, loading);
  try {
    pre();
    await callback();
    after();
    // eslint-disable-next-line no-useless-catch
  } catch (error) {
    throw error;
  } finally {
    spinner.stop(true);
    final();
  }
}
