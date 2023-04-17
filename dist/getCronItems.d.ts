import { SharedOptions, WatchedCronItems } from "./interfaces";
export default function getCronItems(options: SharedOptions, crontabPath: string, watch?: boolean): Promise<WatchedCronItems>;
