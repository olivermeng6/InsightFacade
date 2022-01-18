// const decimal = require("decimal.js");
import Decimal from "decimal.js";
export class QueryTransformer {
    private MAX_TOKEN = "MAX";
    private MIN_TOKEN = "MIN";
    private AVG_TOKEN = "AVG";
    private COUNT_TOKEN = "COUNT";
    private SUM_TOKEN = "SUM";

    private data: any[];
    private grouped: any[][];
    private groupKeys: any[];


    private finalResult: any[];

    public transform(data: any[], transformations: any) {
        this.data = data;
        this.groupKeys = transformations.GROUP;
        this.groupHelper(this.groupKeys);
        this.applyHelper(transformations.APPLY);
        return this.finalResult;
    }

    private groupHelper(keys: any[]) {
        function groupBy(arr: any, f: any) {
            let groups: any = {};
            arr.forEach((o: any) => {
                let group = JSON.stringify(f(o));
                groups[group] = groups[group] || [];
                groups[group].push(o);
            });
            return Object.keys(groups).map(function (group) {
                return groups[group];
            });
        }

        this.grouped = groupBy(this.data, function (item: any) {
            let temp: any[] = [];
            keys.forEach((key: any) => {
                temp.push(item[key]);
            });
            return temp;
        });
    }

    private applyHelper(applyrules: any[]) {
        let results: any[] = [];
        this.grouped.forEach((group: any[]) => {
            let {max, min, count, sum, avg} = this.tokenFunction();
            let result: any = {};
            this.groupKeys.forEach((key) => {
                result[key] = group[0][key];
            });
            for (let applyRule of applyrules) {
                let applyKey = Object.keys(applyRule)[0];
                let applyToken = Object.keys(applyRule[applyKey])[0];
                let value: number = 0;
                if (applyToken === this.MAX_TOKEN) {
                    value = this.getApplyResult(group, applyRule[applyKey][applyToken], max);
                }
                if (applyToken === this.MIN_TOKEN) {
                    value = this.getApplyResult(group, applyRule[applyKey][applyToken], min);
                }
                if (applyToken === this.SUM_TOKEN) {
                    value = Number(this.getApplyResult(group, applyRule[applyKey][applyToken], sum).toFixed(2));
                }
                if (applyToken === this.COUNT_TOKEN) {
                    let valueArr: any[] = [];
                    let key: any = applyRule[applyKey][applyToken];
                    for (let section of group) {
                        if (!valueArr.includes(section[key])) {
                            value++;
                            valueArr.push(section[key]);
                        }
                    }
                }
                if (applyToken === this.AVG_TOKEN) {
                    let avgSum = this.getApplyResult(group, applyRule[applyKey][this.AVG_TOKEN], avg);
                    let countValue = this.getApplyResult(group, applyRule[applyKey][this.COUNT_TOKEN], count);
                    value = Number((avgSum.toNumber() / countValue).toFixed(2));
                }
                result[applyKey] = value;
            }
            results.push(result);
        });
        this.finalResult = results;
    }

    private tokenFunction() {
        let max = ((maxValue: any, currValue: any) => {
            if (maxValue === null || currValue > maxValue) {
                maxValue = currValue;
            }
            return maxValue;
        });

        let min = ((minValue: any, currValue: any) => {
            if (minValue === null || currValue < minValue) {
                minValue = currValue;
            }
            return minValue;
        });

        let count = ((countNum: any, currValue: any) => {
            if (countNum === null) {
                countNum = 0;
            }
            countNum++;
            return countNum;
        });

        let sum = ((sumNum: any, currValue: any) => {
            if (sumNum === null) {
                sumNum = 0;
            }
            sumNum += currValue;
            return sumNum;
        });

        let avg = ((value: any, currValue: any) => {
            if (value === null) {
                value = 0;
            }
            /**
             * TODO: how to declare new Decimal
             */
            let decimalValue = new Decimal(value);
            let decimalCurr = new Decimal(currValue);
            return decimalValue.add(decimalCurr);
        });
        return {max, min, count, sum, avg};
    }

    private getApplyResult(group: any[], key: any, f: any) {
        let value: any = null;
        for (let section of group) {
            value = f(value, section[key]);
        }
        return value;
    }

}
