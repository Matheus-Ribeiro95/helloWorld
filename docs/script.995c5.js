const _FILES = {};
const _READMES = {};
let _tabOpened = false;
const _APILIMITED = {
    "GitHub": false,
    "GitLab": false,
};

document
    .querySelector(".readme")
    .addEventListener("click", function (event) {
        const target = event.target;

        if (
            !(
                (target.nodeName === "LI" &&
                    target.classList.contains("nav-item")) ||
                (target.nodeName === "SPAN" &&
                    target.classList.contains("close"))
            )
        )
            return;

        if (target.nodeName === "LI") {
            const idReadme = target.dataset.idReadme;
            selectTab(idReadme, false);
        } else {
            const idReadme = target.parentElement.dataset.idReadme;
            closeTab(idReadme);
        }
    });

// https://gist.github.com/rfl890/e3c01d6285573f00cb333f6141c4f071
function btoaUTF8(data) {
    const utf8Data = new TextEncoder().encode(data);
    let binaryString = "";
    for (let i = 0; i < utf8Data.length; i++) {
        binaryString += String.fromCharCode(utf8Data[i]);
    }
    return btoa(binaryString);
}
function atobUTF8(data) {
    const decodedData = atob(data);
    const utf8data = new Uint8Array(decodedData.length);
    const decoder = new TextDecoder("utf-8");
    for (let i = 0; i < decodedData.length; i++) {
        utf8data[i] = decodedData.charCodeAt(i);
    }
    return decoder.decode(utf8data);
}

function selectTab(idReadme, isNew = true) {
    setupFiles(idReadme);
    if (!_tabOpened) {
        _tabOpened = true;
        document.querySelector(".files-section").style.minHeight = "212px";
    }

    document.querySelectorAll("li.nav-item").forEach((el) => {
        if (el.dataset.idReadme != idReadme) {
            el.classList.remove("active");
        } else {
            el.classList.add("active");
        }

        const innerDefault = document.getElementById("innerDefault");
        const inner = document.getElementById("inner");

        if (idReadme === "default") {
            inner.classList.add("hide");
            innerDefault.classList.remove("hide");
        } else {
            innerDefault.classList.add("hide");
            inner.classList.remove("hide");

            inner.innerHTML = marked.parse(atobUTF8(_READMES[idReadme]));
        }

        /*
            REVIEW: Good idea?
         */
        if (isNew) document.querySelector(".readme").scrollIntoView();
        setUpCopyIcons();
        setUpAnchorElements();
    });
}

function closeTab(idReadme) {
    if (idReadme === "default") return;

    setupFiles("default");

    const el = document.querySelector(
        `li.nav-item[data-id-readme="${idReadme}"]`
    );
    el.parentElement.removeChild(el);

    selectTab("default", false);
}

function setUpNewTab({ content, repoName, repoURL }) {
    const idReadme = repoURL;
    _READMES[idReadme] = content;

    const liEl = document.createElement("li");
    liEl.classList.add("nav-item");
    liEl.dataset.idReadme = repoURL;
    liEl.textContent = repoName.split("_").join(" ");

    const spanEl = document.createElement("span");
    spanEl.classList.add("close");
    spanEl.textContent = "X";

    liEl.appendChild(spanEl);

    document.querySelector("ul.nav-list").appendChild(liEl);
    selectTab(idReadme);
}

function filesArrayHTML(files) {
    const $filesSection = document.querySelector(".files-section");
    $filesSection.innerHTML = "";
    files.forEach(file => {
        const divEl = document.createElement("div");
        divEl.classList.add("file-item");

        const iEl = document.createElement("i");
        iEl.classList.add("far", "file-icon");

        if (file.type === "dir") iEl.classList.add("fa-folder")
        else iEl.classList.add("fa-file-code");

        const aEl = document.createElement("a");
        aEl.href = file.html_url;
        aEl.target = "_blank";
        aEl.dataset.disabled = "";
        aEl.classList.add("file-name");
        aEl.textContent = file.name;

        divEl.append(iEl, aEl);

        $filesSection.append(divEl);
    });
}

function setupFiles(repoURL) {
    if (_FILES[repoURL]) return filesArrayHTML(_FILES[repoURL]);

    const path =
        repoURL === "default" && "helloWorld" ||
        repoURL.split("/")[4];

    fetch(`https://api.github.com/repos/Matheus-Ribeiro95/${path}/contents`)
        .then(response => {
            if ((response.status === 403 || response.status === 429) && !_APILIMITED["GitHub"]) {
                _APILIMITED["GitHub"] = true;
                alert("GitHub API rate limite alcançado.");

                throw new Error("GitHub API limit rate.");
            }

            return response.json();
        })
        .then(data => {
            const files = data.sort((a, b) => a.type > b.type || a.name.toLowerCase() > b.name.toLowerCase());

            _FILES[repoURL] = files;

            filesArrayHTML(files);
        })
        .catch(error => console.log(error));
}

function setupFilesGitLab(projectID, repoName) {
    if (_FILES[projectID]) return filesArrayHTML(_FILES[projectID]);

    fetch(`https://gitlab.com/api/v4/projects/${projectID.split("/")[4]}/repository/tree`)
        .then(response => response.json())
        .then(data => {
            let files = data.sort((a, b) => b.type.localeCompare(a.type) || a.name.toLowerCase() > b.name.toLowerCase()).map(({ type, name }) => ({
                type: type === "tree" && "dir" || "file",
                name,
                html_url: `https://gitlab.com/Matheus-Ribeiro95/${encodeURI(repoName.toLowerCase().split("_").join("-"))}/-/blob/master/${name}?ref_type=heads`
            }));

            _FILES[projectID] = files;

            filesArrayHTML(files);
        });
}

function getRepoREADME(repoURL, repoName) {
    setupFiles(repoURL);

    if (_READMES[repoURL]) {
        const tabExists =
            document.querySelector(
                `li.nav-item[data-id-readme="${repoURL}"]`
            ) !== null;

        if (tabExists) selectTab(repoURL);
        else
            setUpNewTab({
                content: _READMES[repoURL],
                repoName,
                repoURL,
            });

        return;
    }

    fetch(
        `https://api.github.com/repos/Matheus-Ribeiro95/${repoURL.split("/")[4]}/readme`,
        {
            headers: {
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        }
    )
        .then((response) => {
            if ((response.status === 403 || response.status === 429) && !_APILIMITED["GitHub"]) {
                _APILIMITED["GitHub"] = true;
                alert("GitHub API rate limite alcançado.");

                throw new Error("GitHub API limit rate.");
            }

            return response.json();
        })
        .then((response) => {
            const { content } = response;
            setUpNewTab({
                content,
                repoName,
                repoURL,
            });
        })
        .catch(error => console.log(error));
}

function getRepoGitLabREADME(projectID, repoName) {
    setupFilesGitLab(projectID, repoName);

    if (_READMES[projectID]) {
        const tabExists =
            document.querySelector(
                `li.nav-item[data-id-readme="${projectID}"]`
            ) !== null;

        if (tabExists) selectTab(projectID);
        else
            setUpNewTab({
                content: _READMES[projectID],
                repoName,
                repoURL: projectID,
            });

        return;
    }

    fetch(`https://gitlab.com/api/v4/projects/${projectID.split("/")[4]}/repository/files/README.md?ref=master`)
        .then(response => response.json())
        .then(data => {
            const { content } = data;
            setUpNewTab({
                content,
                repoName,
                repoURL: projectID,
            });
        });
}

function setUpCopyIcons() {
    document.querySelectorAll("i.copy").forEach((el) => {
        if (el.classList.contains("listener")) return;

        el.addEventListener("click", function () {
            const preEl = this.parentElement.parentElement.querySelector("pre code");

            let text = preEl.innerText.trim();

            if (text.indexOf("---")) {
                text = text.split("---")[0].trim();
            }

            navigator.clipboard.writeText(text);
        });

        el.classList.add("listener");
    });
}

function setUpAnchorElements() {
    document.querySelectorAll(".readme a").forEach((el) => {
        el.onclick = function (event) {
            const isDynamic = el.classList.contains("dynamic");

            if (!isDynamic) return;

            const elTrigger = event.target;

            if (elTrigger.nodeName === "SPAN") {
                event.preventDefault();

                el.classList.add("clicked-anchor");

                const isGitHubRepo = el.href.indexOf("github") !== -1;

                if (isGitHubRepo) getRepoREADME(el.href, el.dataset.nameReadme);
                else getRepoGitLabREADME(el.href, el.dataset.nameReadme)
            } else {
                el.classList.add("clicked-icon");
            }
        };
    });
}

const renderer = {
    link: function ({ text, href }) {
        const isLocal = href.indexOf("#") !== -1;
        const isDynamic = href.indexOf("*") === 0;

        const anchorEl = document.createElement("a");

        if (isDynamic) {
            anchorEl.classList.add("dynamic");

            const spanEl = document.createElement("span");
            spanEl.innerText = text;
            anchorEl.appendChild(spanEl);

            const data = href.substring(1).split("|");
            anchorEl.href = data[0];
            anchorEl.dataset.nameReadme = data[1];

            const iEl = document.createElement("i");
            iEl.classList.add(
                "fa-solid",
                "fa-arrow-up-right-from-square"
            );
            anchorEl.appendChild(iEl);
        } else {
            anchorEl.innerText = text;
            anchorEl.href = href;
        }

        if (!isLocal) {
            anchorEl.target = "_blank";
        }

        return anchorEl.outerHTML;
    },
    heading: function ({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);

        const hash = text.toLowerCase().split(" ").join("-");

        return `<h${depth} id="${hash}">${text}</h${depth}>`;
    },
    code: function ({ codeBlockStyle, raw, text, type }) {
        return `<div class="code"><pre><code>${text}</code></pre> <div><i class="copy fa-regular fa-copy"></i></div></div>`;
    },
};

marked.use({ renderer });

fetch("./README.md")
    .then((response) => response.text())
    .then((markdown) => {
        _READMES["default"] = btoaUTF8(markdown);

        document.getElementById("innerDefault").innerHTML = marked.parse(markdown);

        setupFiles("default");

        setUpCopyIcons();
        setUpAnchorElements();
    });
