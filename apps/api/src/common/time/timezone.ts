/**
 * 项目时区配置(从环境变量读取,默认 Asia/Shanghai)
 *
 * 所有时间在「数据库存储」和「接口响应」中统一使用此时区,
 * 不使用 UTC(Z)。Asia/Shanghai = UTC+8,无夏令时。
 */
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Shanghai";

/**
 * 计算给定时间点在目标时区的偏移分钟数(正确处理夏令时)
 * @param timezone IANA 时区名,如 'Asia/Shanghai'、'America/New_York'
 * @param date 待计算的时间点(默认当前)
 */
function getOffsetMinutes(
  timezone: string = APP_TIMEZONE,
  date: Date = new Date()
): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  });
  const part =
    dtf.formatToParts(date).find((p) => p.type === "timeZoneName")?.value ?? "";
  // part 形如 'GMT+8' / 'GMT+08:00' / 'GMT-05:00'
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(part);
  if (!m) return 0;
  const sign = m[1] === "+" ? 1 : -1;
  return sign * (parseInt(m[2], 10) * 60 + (m[3] ? parseInt(m[3], 10) : 0));
}

/** 将分钟数转为偏移字符串,如 480 → '+08:00'、-300 → '-05:00' */
function minutesToOffset(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return `${sign}${h}:${m}`;
}

/**
 * 把 Date 格式化为「带时区偏移」的 ISO 字符串
 * 如 2025-06-20T08:00:00.000Z (UTC) → '2025-06-20T16:00:00.000+08:00' (上海)
 *
 * 用于接口响应序列化,替换默认的 UTC(Z)格式。
 */
export function toZonedISO(
  date: Date,
  timezone: string = APP_TIMEZONE
): string {
  const offsetMin = getOffsetMinutes(timezone, date);
  // 把 UTC 瞬时按偏移量平移到本地「墙上时间」,再取 ISO 的前 23 位(去掉 Z)
  const shifted = new Date(date.getTime() + offsetMin * 60_000);
  const base = shifted.toISOString().slice(0, 23);
  return `${base}${minutesToOffset(offsetMin)}`;
}

/**
 * 当前时区的固定偏移字符串(如 '+08:00')
 * 供 MariaDB 驱动连接选项使用(驱动需要 '+HH:MM' 格式)。
 * 注意:此时区若有夏令时,连接建立后偏移不会随季节自动变化。
 */
export function getOffsetString(timezone: string = APP_TIMEZONE): string {
  return minutesToOffset(getOffsetMinutes(timezone));
}
