

export class QueryOrderHelper {


    public sortByMultipleKeys(data: any[], order: any) {
        let fieldSorter = (fields: any) => (a: any, b: any) => fields.map((o: any) => {
            let dir = 1;
            if (o[0] === "-") {
                dir = -1;
                o = o.substring(1);
            }
            return a[o] > b[o] ? dir : a[o] < b[o] ? -(dir) : 0;
        }).reduce((p: any, n: any) => p ? p : n, 0);

        let sortFilter: any[] = order["keys"];
        if (order["dir"] === "DOWN") {
            let newFilter: any[] = [];
            sortFilter.forEach((key: any) => {
                newFilter.push("-" + key);
            });
            sortFilter = newFilter;
        }
        return data.sort(fieldSorter(sortFilter));
    }
}
