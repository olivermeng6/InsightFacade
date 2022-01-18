import {DefaultTreeNode} from "parse5";


export class TableFinder {
    private foundTable: boolean = false;
    private tableHead: string[] = [];
    private tbody: DefaultTreeNode[] = [];
    private table: DefaultTreeNode[] = [];

    public findValidTable(indexes: any): any {
        let tbl: any;
        this.findTable(indexes);
        this.table.forEach((table: any) => {
            if ("childNodes" in table) {
                table.childNodes.forEach((child: any) => {
                    if ("childNodes" in child && "nodeName" in child && child.nodeName === "thead") {
                        this.childHelper(child);
                    }
                });
                let roomtableHeaderName: string[] = ["Room", "Capacity", "Furniture type", "Room type"];
                let indextableHeaderName: string[] = ["Code", "Building", "Address"];
                if (this.arraysEqual(roomtableHeaderName, this.tableHead)
                    || this.arraysEqual(indextableHeaderName, this.tableHead)) {
                    return tbl = table;
                }
                this.tableHead = [];

            }
        });
        return tbl;
    }

    private arraysEqual(a: string[], b: string[]) {
        if (a === b) {
            return true;
        }
        if (a == null || b == null) {
            return false;
        }
        if (a.length !== b.length) {
            return false;
        }

        for (let i = 0; i < a.length; ++i) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }

    private findTable(indexes: any) {
        if ("nodeName" in indexes && indexes.nodeName === "table") {
            this.table.push(indexes);
        } else if ("childNodes" in indexes) {
            indexes.childNodes.forEach((childindexes: any) => {
                this.findTable(childindexes);
            });
        }
    }

    // private tableHelper(indexes: any) {
    //     if ("nodeName" in indexes && indexes.nodeName === "tbody") {
    //         this.foundTable = true;
    //         this.tbody.push(indexes);
    //     } else if ("childNodes" in indexes) {
    //         indexes.childNodes.forEach((childindexes: any) => {
    //             this.tableHelper(childindexes);
    //         });
    //     }
    // }

    private childHelper(child: any) {
        child.childNodes.forEach((tr: any) => {
            if ("childNodes" in tr && "nodeName" in tr && tr.nodeName === "tr") {
                tr.childNodes.forEach((th: any) => {
                    if ("childNodes" in th && "nodeName" in th && th.nodeName === "th") {
                        this.thHelper(th);
                    }
                });
            }
        });
    }

    private thHelper(th: any) {
        th.childNodes.forEach((text: any) => {
            if ("nodeName" in text && text.nodeName === "#text" && "value" in text && text.value.trim().length !== 0) {
                this.tableHead.push(text.value.trim());
            }
        });
    }

    private getFoundTable() {
        return this.foundTable;
    }
}
