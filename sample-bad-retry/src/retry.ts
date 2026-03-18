export async function callApi(fetcher: () => Promise<any>) {
  while (true) {
    try {
      return await fetcher();
    } catch (e: any) {
      if (e?.status === 429) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw e;
    }
  }
}