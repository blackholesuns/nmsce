export function GetUrlParameters() {
    let parameters = {};
    location.search
        .substr(1)
        .split("&")
        .forEach(function (item) {
          let tmp = item.split("=");
          parameters[decodeURIComponent(tmp[0])] = decodeURIComponent(tmp[1]);
        });
    return parameters;
}