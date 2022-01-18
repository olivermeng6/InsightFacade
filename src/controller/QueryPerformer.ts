import {InsightError, ResultTooLargeError} from "./IInsightFacade";
import {QueryTransformer} from "./QueryTransformer";
import {QueryOrderHelper} from "./QueryOrderHelper";

export class QueryPerformer {
    private data: Map<string, any[]> = new Map<string, any[]>();
    private datasetID: string = " ";
    private columns: string[] = [];
    private order: any = " ";
    private filteredData: any[];

    private isApplyKey: RegExp = /^[^_]+$/;


    public performQuery(query: any, data: Map<string, any[]>): Promise<any[]> {
        this.data = data;
        try {
            this.optionsFilter(query["OPTIONS"]);
            if ("TRANSFORMATIONS" in query) {
                this.datasetID = query["TRANSFORMATIONS"]["GROUP"][0].split(`_`)[0];
            }
            this.filteredData = this.data.get(this.datasetID);
            if (Object.keys(query["WHERE"]).length === 0) {
                this.filteredData = this.data.get(this.datasetID);
            } else {
                this.filteredData = this.queryFilter(query["WHERE"]);
            }
            if ("TRANSFORMATIONS" in query) {
                this.filteredData = new QueryTransformer().transform(this.filteredData, query["TRANSFORMATIONS"]);
            }
            this.filterColumns();
            if (this.order !== " " && typeof this.order === "string") {
                this.orderData();
            } else if (typeof this.order === "object") {
                this.filteredData = new QueryOrderHelper()
                    .sortByMultipleKeys(this.filteredData, query["OPTIONS"]["ORDER"]);
            }
        } catch (e) {
            return Promise.reject(new InsightError(e));
        }
        if (this.filteredData.length > 5000) {
            return Promise.reject(new ResultTooLargeError("Result too large"));
        }
        return Promise.resolve(this.filteredData);
    }

    private optionsFilter(options: any) {
        this.columnsFilter(options["COLUMNS"]);
        this.order = options["ORDER"];
        // if (this.columns.includes(options["ORDER"])) {
        //
        // }
    }

    // setting columns field and checking for more than one dataset
    // set datasetID field
    private columnsFilter(arr: string[]) {
        this.columns = [...new Set(arr)];
        for (let column of arr) {
            let output = column.split("_");
            if (this.datasetID === " ") {
                this.datasetID = output[0];
            }
            // else if (this.datasetID !== output[0]) {
            //     throw new InsightError("more than one dataset required");
            // }
        }
    }

    private queryFilter(query: any): any[] {
        let filteredArr: any[] = [];
        let keys = Object.keys(query);
        if (keys[0] === "AND" || keys[0] === "OR") {
            filteredArr = this.logicFilter(query[keys[0]], keys[0]);
        } else if (keys[0] === "NOT") {
            filteredArr = this.negFilter(query["NOT"]);
        } else {
            filteredArr = this.assignKeyFilter(query);
        }
        return filteredArr;
    }

    private negFilter(filter: any): any[] {
        let filteredArr: any[] = this.queryFilter(filter);
        let sections: any[] = this.data.get(this.datasetID);
        filteredArr = sections.filter((x) => {
            return !filteredArr.includes(x);
        });
        return filteredArr;
    }

    private logicFilter(arr: any[], operation: string): any[] {
        let filteredArr: any[] = [];
        if (operation === "AND") {
            let first: boolean = true;
            for (let filter of arr) {
                // this.filteredData = filteredArr;
                let temp: any[] = this.queryFilter(filter);
                if (first) {// || filteredArr === undefined || filteredArr.length === 0
                    filteredArr = temp;
                    first = false;
                } else {
                    filteredArr = filteredArr.filter((x) => {
                        return temp.includes(x);
                    });
                }
            }
        }
        if (operation === "OR") {
            for (let filter of arr) {
                let concat: any[] = this.queryFilter(filter).concat(filteredArr);
                filteredArr = [...new Set(concat)];
                // this.filteredData = filteredArr;
            }
        }
        return filteredArr;
    }

    private assignKeyFilter(filter: any): any[] {
        if (Object.keys(filter)[0] === "IS") {
            return this.scomparatorFilter(filter["IS"]);
        }
        if (Object.keys(filter)[0] === "GT") {
            return this.gtFilter(filter["GT"]);
        }
        if (Object.keys(filter)[0] === "LT") {
            return this.ltFilter(filter["LT"]);
        }
        if (Object.keys(filter)[0] === "EQ") {
            return this.eqFilter(filter["EQ"]);
        }
    }

// checks if scomparator contains more than one key
    // slice off filteredData array according to the conditions
    private scomparatorFilter(scomp: any): any[] {
        let key = Object.keys(scomp)[0];
        let value = scomp[key];
        let temp: any[] = [];
        let splitValue = value.split("*");
        if (splitValue.length === 1) {
            for (let sectionObject of this.filteredData) {
                if (sectionObject[key] === value) {
                    temp.push(sectionObject);
                }
            }
        } else if (splitValue.length === 2) {
            if (splitValue[0].length === 0) {
                for (let sectionObject of this.filteredData) {
                    if (sectionObject[key].endsWith(splitValue[1])) {
                        temp.push(sectionObject);
                    }
                }
            } else {
                for (let sectionObject of this.filteredData) {
                    if (sectionObject[key].startsWith(splitValue[0])) {
                        temp.push(sectionObject);
                    }
                }
            }
        } else if (splitValue.length === 3) {
            for (let sectionObject of this.filteredData) {
                if (sectionObject[key].includes(splitValue[1])) {
                    temp.push(sectionObject);
                }
            }
        }
        return temp;
    }

    // checks if mcomparator contains more than one key
    // slice off filteredData array according to the conditions
    private gtFilter(mcomp: any): any[] {
        let key = Object.keys(mcomp);

        let temp: any[] = [];
        for (let sectionObject of this.filteredData) {
            if (sectionObject[key[0]] > mcomp[key[0]]) {
                temp.push(sectionObject);
            }
        }
        return temp;
    }

    private ltFilter(mcomp: any): any[] {
        let key = Object.keys(mcomp);
        let temp: any[] = [];
        for (let sectionObject of this.filteredData) {
            if (sectionObject[key[0]] < mcomp[key[0]]) {
                temp.push(sectionObject);
            }
        }
        return temp;
    }

    private eqFilter(mcomp: any): any[] {
        let key = Object.keys(mcomp);
        let temp: any[] = [];
        for (let sectionObject of this.filteredData) {
            if (sectionObject[key[0]] === mcomp[key[0]]) {
                temp.push(sectionObject);
            }
        }
        return temp;
    }

    private filterColumns() {
        let filteredArr: any[] = [];
        for (let section of this.filteredData) {
            let newSection: any = {};
            for (let key of this.columns) {
                newSection[key] = section[key];
            }
            filteredArr.push(newSection);
        }
        this.filteredData = filteredArr;
    }

    private orderData() {
        this.filteredData.sort((a, b) => {
            function compareStrings(one: any, two: any) {
                return (one < two) ? -1 : (one > two) ? 1 : 0;
            }

            return compareStrings(a[this.order], b[this.order]);
        });
    }

    private getId(q: any) {
        if ("TRANSFORMATIONS" in q) {
            this.datasetID = q["TRANSFORMATIONS"]["GROUP"][0].split(`_`)[0];
        } else {
            this.datasetID = q["OPTIONS"]["COLUMNS"][0].split(`_`)[0];
        }
    }
}
