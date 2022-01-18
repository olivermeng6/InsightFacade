/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */


CampusExplorer.buildQuery = function () {
    let query = {};
    let form = document.getElementsByClassName("tab-panel active")[0].children[0];
    let id = form.getAttribute("data-type");
    let where = buildWhere(form, id);
    let options = buildOptions(form, id);
    let transformation = buildTransformation(form, id);

    query["WHERE"] = where;
    query["OPTIONS"] = options;
    if (transformation !== null) {
        query["TRANSFORMATIONS"] = transformation;
    }
    return query;
};

function buildWhere(form, id) {
    let logicCondition;
    let filterArr = [];

    let all = form.getElementsByClassName("control conditions-all-radio")[0].getElementsByTagName("input")[0];
    let any = form.getElementsByClassName("control conditions-any-radio")[0].getElementsByTagName("input")[0];
    let none = form.getElementsByClassName("control conditions-none-radio")[0].getElementsByTagName("input")[0];

    if (all.checked) {
        logicCondition = "AND";
    } else if (any.checked) {
        logicCondition = "OR";
    } else if (none.checked) {
        logicCondition = "OR";
    }

    let conditionContainer = form.getElementsByClassName("control-group condition");

    if (conditionContainer.length === 0) {
        return {};
    }
    for (let condition of conditionContainer) {
        // boolean true if not is checked
        let controlNot = condition.children[0].getElementsByTagName("input")[0].checked;
        // find control field: dept, uuid...
        let controlFields = condition.children[1].children[0];
        let field = controlFields[controlFields.selectedIndex].value;
        // find filter: EQ,LT,GT
        let controlOperators = condition.children[2].children[0];
        let filter = controlOperators[controlOperators.selectedIndex].value;
        // find input: user input
        let input = condition.children[3].children[0].value;
        if (isNumericKey(field)) {
            input = Number(input);
        }
        // key = courses_uuid
        let key = id + "_" + field;
        // {courses_uuid: 88}
        let keyWithValue = {};
        keyWithValue[key] = input;
        //{GT: {courses_uuid: 88}}
        let object = {};
        object[filter] = keyWithValue;
        // check if not is selected
        //{NOT:{GT: {courses_uuid: 88}}}
        if (controlNot) {
            let notObj = {};
            notObj["NOT"] = object;
            object = notObj;
        }
        filterArr.push(object);
    }

    if (conditionContainer.length === 1) {
        if (none.checked) {
            let noneObj = {};
            noneObj["NOT"] = filterArr[0];
            return noneObj;
        }
        return filterArr[0];
    }

    let filters = {};
    filters[logicCondition] = filterArr;
    if (none.checked) {
        let noneObj = {};
        noneObj["NOT"] = filters;
        filters = noneObj;
    }
    return filters;
}

function buildOptions(form, id) {
    let options = {};
    let columns = [];
    let order = {};
    let orderKeys = [];

    let controlFields = form.getElementsByClassName("form-group columns")[0].getElementsByTagName("input");
    for (let controlField of controlFields) {
        if (controlField.checked) {
            if (controlField.id === "") {
                columns.push(controlField.value);
            } else {
                columns.push(id + "_" + controlField.value);
            }
        }
    }
    options["COLUMNS"] = columns;

    let orderFields = form.getElementsByClassName("form-group order")[0].getElementsByTagName("option");
    for (let orderField of orderFields) {
        if (orderField.selected) {
            if (orderField.getAttribute("class") === "transformation") {
                orderKeys.push(orderField.value);
            } else {
                orderKeys.push(id + "_" + orderField.value);
            }
        }
    }
    order["keys"] = orderKeys;

    if (form.getElementsByClassName("control descending")[0].children[0].checked) {
        order["dir"] = "DOWN";
    } else {
        order["dir"] = "UP";
    }
    if (orderKeys.length !== 0) {
        options["ORDER"] = order;
    }
    return options;
}

function buildTransformation(form, id) {
    let transformation = {};
    let group = [];
    let apply = [];

    let groupFields = form.getElementsByClassName("form-group groups")[0].getElementsByTagName("input");
    for (let groupField of groupFields) {
        if (groupField.checked) {
            group.push(id + "_" + groupField.value);
        }
    }

    let transformations = form.getElementsByClassName("form-group transformations")[0].getElementsByClassName("control-group transformation");
    for (let transformation of transformations) {
        let applyKey = transformation.getElementsByTagName("input")[0].value;
        let applyToken;
        let key;

        let tokens = transformation.getElementsByClassName("control operators")[0].getElementsByTagName("select")[0];
        applyToken = tokens[tokens.selectedIndex].value;
        let keys = transformation.getElementsByClassName("control fields")[0].getElementsByTagName("select")[0];
        key = id + "_" + keys [keys.selectedIndex].value;

        let inner = {};
        let outer = {};
        inner[applyToken] = key;
        outer[applyKey] = inner;
        apply.push(outer);
    }
    if (apply.length === 0 || group.length === 0) {
        return null;
    }
    transformation["GROUP"] = group;
    transformation["APPLY"] = apply;
    return transformation;
}

function isNumericKey(key) {
    return key === "avg"
        || key === "pass" || key === "fail"
        || key === "audit" || key === "year" || key === "lat"
        || key === "lon" || key === "seats";
}

