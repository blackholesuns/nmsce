import { galaxyList } from "./constants.js";

const galaxyRegex = `(${galaxyList.map(v => v.name).join("|")})`;

/**
 * 
 * 
 * @export
 * @param {HTMLElement} JElement
 * @param {string} ElementName 
 * @param {Array<any>} List 
 * @param {Function<object>} Callback 
 * @param {{tip: string, required: boolean, labelsize: string}} Options Options
 * @returns {void}
 */
export function BuildGalaxyMenu(JElement, ElementName, List, Callback, { tip, required, labelsize}){
    let id = ElementName.nameToId();


    let requiredHtml = (required && `&nbsp;<span class="h5 text-danger">*</span>`) || ""
    let titleHtml = `<div class="${labelsize} txt-label-def">${ElementName}&nbsp;${requiredHtml}</div>`;
    let tipHtml = tip && `&nbsp;<span class="far fa-question-circle text-danger h6" data-toggle="tooltip" data-html="true" data-placement="bottom" title="${tip}"/>` ||"";
    let listElementGen = (value) => `<option value="${value}">`;

    let listHtml = List.map(v => listElementGen(v.name)).join("\n");
    let datalistHtml = `<datalist id="${id}-datalist">${listHtml}</datalist>`
    
    let inputHtml = `
    <div>
        <input list="${id}-datalist" pattern="${galaxyRegex}" title="Valid Galaxy Name" id="btn-${id}" name="${id}" required/>
        ${tipHtml}
        ${datalistHtml}
    </div>
    `;
    
    let locElement = JElement.find("#id-" + id);

    locElement.empty();
    locElement.append(`<div class="row">${titleHtml}${inputHtml}<div>`);
}

