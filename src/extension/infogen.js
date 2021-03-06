(function($) {
    let Gen = {
        html: `<div id="tab-extension-infogen" class="top-nav">
    <h1 class="page-header">种子简介生成</h1>
    <p class="hl-green">
        从豆瓣、Bangumi、Steam等站点获取信息并生成符合PT站简介需求的种子简介。
        <br> 如果你输入的是文字形式，则
        <strong>默认使用豆瓣作为搜索工具</strong>，其他搜索工具请在按钮组中选择；链接形式程序会自动处理。
        <br> 试你网络情况，补充信息可能会请求较长时间（如IMDb信息出现“有链接但无评分”情况），在未提示“请求失败”的情况下请耐心等待。
    </p>
    <h2></h2>
    <div class="row">
        <div class="col-sm-8 col-sm-offset-2 col-md-10 col-md-offset-1">
            <div class="input-group" style="width: 60%">
                <input id="gen-link" type="search" class="form-control search-input" placeholder="资源名或豆瓣/IMDB/Bangumi站点的链接">
                <div class="input-group-btn">
                    <button type="button" class="btn btn-primary" id="gen-search">查询</button>
                    <button type="button" class="btn btn-primary dropdown-toggle" data-toggle="dropdown" tabindex="-1">
                        <span class="caret"></span>
                        <!--<span class="sr-only">查询</span>-->
                    </button>
                    <ul class="dropdown-menu pull-right" role="menu">
                        <li><a id="gen-search-bgm">通过Bangumi查询</a></li>
                        <li><a id="gen-search-steam">通过Steam查询</a></li>
                    </ul>
                </div>
            </div>
            <hr>
            <div id="gen-help" class="hide"></div>
            <div id="gen-out" class="zero-clipboard">
                <button class="btn btn-clipboard" data-clipboard-target="#gen-output">复制</button>
                <textarea class="form-control" rows=20 id="gen-output"></textarea>
            </div>
        </div>
    </div>
</div>`,

        search: {
            help_table_text: `<thead><tr><th></th></tr></thead><tbody><tr><td></td></tr>`,  // 子方法请重写该变量
            clean() {
                $("#gen-help").html(`<div class="table-responsive"><table class="table table-hover" id="gen-search-table">${Gen.search.help_table_text}</tbody></table></div>`).show();   // 显示帮助表格
                $("#gen-out").hide();   // 隐藏输出窗口

                // 为所有链接添加DOM监听
                $("a.gen-search-choose").click(function () {
                    let tag = $(this);
                    $('#gen-link').val(tag.attr("data-url"));
                    $("#gen-search").click();
                });
            },   // 所有Search子方法完成后请调用
            douban() {
                $.getJSON(`https://api.douban.com/v2/movie/search?q=${Gen.key()}`, resj => {
                    if (resj.total !== 0) {
                        Gen.search.help_table_text = resj.subjects.reduce((accumulator, currentValue) => {
                            return accumulator += `<tr><td>${currentValue.year}</td><td>${currentValue.subtype}</td><td>${currentValue.title}</td><td><a href='${currentValue.alt}' target='_blank'>${currentValue.alt}</a></td><td><a href='javascript:void(0);' class="gen-search-choose" data-url="${currentValue.alt}">选择</a></td></tr>`;
                        },"<thead><tr><th>年代</th><th>类别</th><th>标题</th><th>豆瓣链接</th><th>行为</th></tr></thead><tbody>");
                        Gen.search.clean();
                    } else {
                        system.showErrorMessage("豆瓣搜索未返回有效数据。");
                    }
                });
            },  // 豆瓣搜索相关
            bangumi() {
                $.getJSON(`https://api.bgm.tv/search/subject/${Gen.key()}?responseGroup=large&max_results=20&start=0`, resj => {
                    let tp_dict = {1: "漫画/小说", 2: "动画/二次元番", 3: "音乐", 4: "游戏", 6: "三次元番"};
                    if (resj.code !== 404 && resj.results !== 0) {
                        Gen.search.help_table_text = resj.list.reduce((a,i_item) => {
                            let name = i_item.name_cn ? `${i_item.name_cn} | ${i_item.name}` : i_item.name;
                            return a+= `<tr><td class="nobr">${i_item.air_date}</td><td class="nobr">${tp_dict[i_item.type]}</td><td>${name}</td><td class="nobr"><a href="${i_item.url}" target="_blank">${i_item.url}</a></td><td class="nobr"><a href="javascript:void(0);" class="gen-search-choose" data-url="${i_item.url}">选择</a></td></tr>`
                        },"<thead><tr><td>放送开始</td><td>类别</td><td>名称</td><td>Bangumi链接</td><td>行为</td></tr></thead><tbody>");
                        Gen.search.clean();
                    } else {
                        system.showErrorMessage("Bangumi搜索未返回有效数据。");
                    }
                });
            }, // Bangumi搜索相关
            steam() {
                $.ajax({
                    type: "get",
                    url: `https://store.steampowered.com/search/?term=${Gen.key()}`,
                    success: data => {
                        let parser = html_parser(data);
                        let search_list = parser.page.find("div#search_result_container a.search_result_row");
                        if (search_list.length !== 0) {

                            let html = "<thread><tr><td>封面</td><td>游戏（英文）名</td><td>发售日期</td><td>售价</td><td>行为</td></tr></thread><tbody>";
                            search_list.each( (index, element) => {
                                let b_tag = $(element);

                                let url =  b_tag.attr("href");
                                let img = b_tag.find("img").attr("src");
                                let title = b_tag.find("span.title").text().trim();
                                let release = b_tag.find("div.search_released").text().trim();
                                let price = b_tag.find("div.search_price").text().trim();

                                html += `<tr><td><img src="${img}" /></td><td class="nobr">${title}</td><td class="nobr">${release}</td><td class="nobr">${price}</td><td class="nobr"><a href="javascript:void(0);" class="gen-search-choose" data-url="${url}">选择</a></td></tr>`
                            });

                            Gen.search.help_table_text = html;
                            Gen.search.clean();
                        } else {
                            system.showErrorMessage("Steam搜索未返回有效数据。");
                        }
                    }
                })
            }    // Steam 搜索相关
        },

        key() {
            return $("input#gen-link").val().trim();
        },  // 返回搜索的Key

        output(info) {
            $("textarea#gen-output").val(info);
        },  // 将搜索结果填入输出窗口

        gen_locale(subject_url) {
            subject_url = subject_url || Gen.key();
            if (subject_url.match(/\/\/movie\.douban\.com/)) {
                // 以下豆瓣相关解析修改自 `https://greasyfork.org/zh-CN/scripts/38878-电影信息查询脚本` 对此表示感谢
                let fetch = function (anchor) {
                    return anchor[0].nextSibling.nodeValue.trim();
                };

                $.ajax({
                    type: "get",
                    url: subject_url,
                    success: data => {
                        let parser = html_parser(data);
                        system.showMessage("已成功豆瓣获取源页面，开始解析");

                        let movie_id = subject_url.match(/\/subject\/(\d+)/)[1];

                        // 全部需要获取的信息
                        let poster;
                        let this_title, trans_title, aka;
                        let year, region, genre,language,playdate;
                        let imdb_link, imdb_average_rating, imdb_votes, imdb_rating;
                        let douban_link, douban_average_rating, douban_votes, douban_rating;
                        let episodes, duration;
                        let director, writer, cast;
                        let tags,introduction,awards;

                        // 简介生成和填入方法
                        let descriptionGenerator = function () {
                            let descr = "";
                            descr += poster ? `[img]${poster}[/img]\n\n` : "";
                            descr += trans_title ? `◎译　　名　${trans_title}\n` : "";
                            descr += this_title ? `◎片　　名　${this_title}\n` : "";
                            descr += year ? `◎年　　代　${year}\n` : "";
                            descr += region ? `◎产　　地　${region}\n` : "";
                            descr += genre ? `◎类　　别　${genre}\n` : "";
                            descr += language ? `◎语　　言　${language}\n` : "";
                            descr += playdate ? `◎上映日期　${playdate}\n` : "";
                            descr += imdb_rating ? `◎IMDb评分  ${imdb_rating}\n` : "";
                            descr += imdb_link ? `◎IMDb链接  ${imdb_link}\n` : "";
                            descr += douban_rating ? `◎豆瓣评分　${douban_rating}\n` : "";
                            descr += douban_link ? `◎豆瓣链接　${douban_link}\n` : "";
                            descr += episodes ? `◎集　　数　${episodes}\n` : "";
                            descr += duration ? `◎片　　长　${duration}\n` : "";
                            descr += director ? `◎导　　演　${director}\n` : "";
                            descr += writer ? `◎编　　剧　${writer}\n` : "";
                            descr += cast ? `◎主　　演　${cast.replace(/\n/g, '\n' + '　'.repeat(4) + '  　').trim()}\n` : "";
                            descr += tags ? `\n◎标　　签　${tags}\n` : "";
                            descr += introduction ? `\n◎简　　介\n\n　　${introduction.replace(/\n/g, '\n' + '　'.repeat(2))}\n` : "";
                            descr += awards ? `\n◎获奖情况\n\n　　${awards.replace(/\n/g, '\n' + '　'.repeat(2))}\n` : "";

                            Gen.output(descr);
                        };

                        let chinese_title = parser.doc.title.replace('(豆瓣)', '').trim();
                        let foreign_title = parser.page.find('#content h1>span[property="v:itemreviewed"]').text().replace(chinese_title, '').trim();
                        let aka_anchor = parser.page.find('#info span.pl:contains("又名")');
                        if (aka_anchor[0]) {
                            aka = fetch(aka_anchor).split(' / ').sort(function (a, b) {//首字(母)排序
                                return a.localeCompare(b);
                            }).join('/');
                        }
                        if (foreign_title) {
                            trans_title = chinese_title + (aka ? ('/' + aka) : '');
                            this_title = foreign_title;
                        } else {
                            trans_title = aka ? aka : '';
                            this_title = chinese_title;
                        }

                        year = parser.page.find('#content>h1>span.year').text().slice(1, -1);  //年代
                        //产地
                        let regions_anchor = parser.page.find('#info span.pl:contains("制片国家/地区")');
                        if (regions_anchor[0]) {
                            region = fetch(regions_anchor).split(' / ').join('/');
                        }
                        //类别
                        genre = parser.page.find('#info span[property="v:genre"]').map(function () {
                            return $(this).text().trim();
                        }).toArray().join('/');
                        //语言
                        let language_anchor = parser.page.find('#info span.pl:contains("语言")');
                        if (language_anchor[0]) {
                            language = fetch(language_anchor).split(' / ').join('/');
                        }
                        //上映日期
                        playdate = parser.page.find('#info span[property="v:initialReleaseDate"]').map(function () {
                            return $(this).text().trim();
                        }).toArray().sort(function (a, b) {//按上映日期升序排列
                            return new Date(a) - new Date(b);
                        }).join('/');
                        //IMDb链接
                        let imdb_link_anchor = parser.page.find('#info span.pl:contains("IMDb链接")');
                        if (imdb_link_anchor[0]) {
                            imdb_link = imdb_link_anchor.next().attr('href').replace(/(\/)?$/, '/');
                            $.ajax({  // IMDb信息（最慢，不放在请求清单中最先且单独请求）
                                type: "get",
                                url: imdb_link,
                                beforeSend: () => {
                                    system.showMessage("发现IMDb链接，开始请求评分信息，请耐心等待。");
                                },
                                success: data1 => {
                                    parser = html_parser(data1);
                                    imdb_average_rating = parser.page.find("span[itemprop='ratingValue']").text() || "";
                                    imdb_votes = parser.page.find("span[itemprop='ratingCount']").text() || '';
                                    imdb_rating = imdb_votes ? imdb_average_rating + '/10 from ' + imdb_votes + ' users' : '';
                                    descriptionGenerator();
                                },
                                error: () => {
                                    system.showErrorMessage("IMDb资源请求失败。");
                                },
                            });
                        }

                        douban_link = 'https://' + subject_url.match(/movie.douban.com\/subject\/\d+\//);  //豆瓣链接
                        //集数
                        let episodes_anchor = parser.page.find('#info span.pl:contains("集数")');
                        if (episodes_anchor[0]) {
                            episodes = fetch(episodes_anchor);
                        }
                        //片长
                        let duration_anchor = parser.page.find('#info span.pl:contains("单集片长")');
                        if (duration_anchor[0]) {
                            duration = fetch(duration_anchor);
                        } else {
                            duration = parser.page.find('#info span[property="v:runtime"]').text().trim();
                        }

                        descriptionGenerator();   // 预生成一次
                        system.showMessage("豆瓣主页面解析完成，开始请求补充信息，请等待完全请求完成。");

                        $.ajax({
                            type: "get",
                            url: douban_link + 'awards',
                            success: data1 => {
                                let parser = html_parser(data1);
                                awards = parser.page.find('#content>div>div.article').html()
                                    .replace(/[ \n]/g, '')
                                    .replace(/<\/li><li>/g, '</li> <li>')
                                    .replace(/<\/a><span/g, '</a> <span')
                                    .replace(/<(div|ul)[^>]*>/g, '\n')
                                    .replace(/<[^>]+>/g, '')
                                    .replace(/&nbsp;/g, ' ')
                                    .replace(/ +\n/g, '\n')
                                    .trim();
                                descriptionGenerator();
                            },
                            error: () => {
                                system.showErrorMessage("豆瓣获奖信息请求失败。");
                            },
                        });    // 该影片的评奖信息
                        $.ajax({
                            type: "get",
                            url: 'https://api.douban.com/v2/movie/' + movie_id,
                            success: data1 => {
                                douban_average_rating = data1.rating.average || 0;
                                douban_votes = data1.rating.numRaters.toLocaleString() || 0;
                                douban_rating = douban_average_rating + '/10 from ' + douban_votes + ' users';
                                introduction = data1.summary.replace(/^None$/g, '暂无相关剧情介绍');
                                poster = data1.image.replace(/s(_ratio_poster|pic)/g, 'l$1');
                                director = data1.attrs.director ? data1.attrs.director.join(' / ') : '';
                                writer = data1.attrs.writer ? data1.attrs.writer.join(' / ') : '';
                                cast = data1.attrs.cast ? data1.attrs.cast.join('\n') : '';
                                tags = data1.tags.map(function (member) {
                                    return member.name;
                                }).join(' | ');
                                descriptionGenerator();
                            },
                            error: () => {
                                system.showErrorMessage("豆瓣其他信息请求失败。");
                            },
                        });  //豆瓣评分，简介，海报，导演，编剧，演员，标签
                    },
                    error: () => {
                        system.showErrorMessage("该链接对应的资源似乎并不存在，你确认没填错");
                    }
                });
            }   // 豆瓣链接
            else if (subject_url.match(/www\.imdb\.com\/title\/(tt\d+)/)) {
                let imdb_id = subject_url.match(/www\.imdb\.com\/title\/(tt\d+)/)[1];
                $.getJSON("https://api.douban.com/v2/movie/imdb/" + imdb_id,(data1) => {
                    if (data1["alt"]) {
                        subject_url = data1["alt"].replace("/movie/","/subject/") + "/";
                        Gen.gen(subject_url);
                    }
                }).fail(() => {
                    system.showErrorMessage("不能在豆瓣上找到对应IMDb编号，查询失败。");
                })
            }  // IMDb 链接
            else if (subject_url.match(/\/\/(bgm\.tv|bangumi\.tv|chii\.in)\/subject/)) {
                // 以下Bgm相关解析修改自以下脚本，对此表示感谢：
                // - https://github.com/Rhilip/PT-help/blob/master/docs/js/Bangumi%20-%20Info%20Export.user.js
                // - https://greasyfork.org/scripts/39367-byrbt-bangumi-info

                $.get(subject_url,function (data) {
                    let parser = html_parser(data);
                    let img,story,staff,cast;
                    img = "https:" + parser.page.find("img.cover").attr("src").replace(/cover\/[lcmsg]/, "cover/l");
                    story = (parser.page.find('#subject_summary').html() || '')
                        .split('<br>')
                        .map(html => $('<p>').html(html).text().trim())
                        .join("\n");

                    let staff_box = parser.page.find("ul#infobox");
                    let staff_li = staff_box.find('a').closest('li');

                    staff_box.find('a').each(function () {
                        let a = $(this);
                        let t = a.attr('title');
                        if (t) a.text(t.trim());
                    });
                    staff = staff_box.find('li').slice(staff_li.first().index(), staff_li.last().index() + 1).map((i,item) => {
                        let li = $(item);
                        let tip = li.find('.tip');
                        let key = tip.text().replace(': ', '');
                        tip.remove();
                        let val = li.text();
                        return `${key}：${val}`;
                    }).get().slice(0, 9);

                    let cast_box = parser.page.find("ul#browserItemList");
                    cast = cast_box.find("li").map((i,item) => {
                        let li = $(item);
                        let cast_name = li.find("span.tip").text();
                        if (!cast_name.length) {
                            cast_name = li.find("div > strong > a").text().replace(/(^\s*)|(\s*$)/g, "");
                        }
                        let cv_name = li.find("span.tip_j > a").map((i,item) => {return $(item).text()}).get().join(" / ");
                        return `${cast_name} : ${cv_name}`
                    }).get();

                    function renderDescr() {
                        let descr = "";
                        descr += img ? `[img]${img}[/img]\n\n` : "";
                        descr += story ? `【STORY】\n\n${story}\n\n` : "";
                        descr += staff ? `【STAFF】\n${staff.join("\n")}\n\n` : "";
                        descr += cast ? `【CAST】\n${cast.join("\n")}\n\n` : "";
                        descr += "(简介信息来源于 " + subject_url + " )";
                        Gen.output(descr);
                    }

                    renderDescr();
                });
            }  // Bangumi链接
            else if (subject_url.match(/(store\.)?steam(powered|community)\.com\/app\/\d+/)) {
                // 设置Cookies
                chrome.cookies.set({
                    url: "https://store.steampowered.com/",
                    name: "Steam_Language",
                    value: "schinese",
                    path: "/"
                });  // 设置为中文界面
                chrome.cookies.set({
                    url: "https://store.steampowered.com/",
                    name: "mature_content",
                    value: "1",
                    path: "/"
                });  // 避免 Steam 年龄认证（直接点击类）

                let steam_id = subject_url.match(/app\/(\d+)/)[1];

                function steam_parser(data) {
                    // 所有需要获取的信息
                    let cover,cname,name,genre,developer,publisher,date,linkbar,language,tags,review;
                    let introduce,screenshot,sysreq;

                    // 简介生成方法
                    function descriptionGenerator() {
                        let descr = "";
                        descr += cover ? `[img]${cover}[/img]\n\n` : "";
                        descr += "【基本信息】\n\n";
                        descr += cname ? `中文名： ${cname}\n` : "";
                        descr += name ? `英文名： ${name}\n` : "";
                        descr += genre ? `类型： ${genre.join(", ")}\n` : "";
                        descr += developer ? `开发商： ${developer.join(", ")}\n` : "";
                        descr += publisher ? `发行商： ${publisher.join(", ")}\n` : "";
                        descr += date ? `发行日期： ${date}\n` : "";
                        descr += linkbar ? `官网： ${linkbar}\n` : "";
                        descr += language ? `游戏语种： ${language.join(" / ")}\n` : "";
                        descr += tags ? `标签： ${tags.join(" / ")}\n` : "";
                        descr += review ? `${review.join("\n")}\n` : "";
                        descr += "\n【游戏简介】\n\n";
                        descr += introduce ? `${introduce}\n\n` : "";
                        descr += "\n【配置需求】\n\n";
                        descr += sysreq ? `${sysreq.join("\n\n")}\n\n` : "";
                        descr += "\n【游戏截图】\n\n";
                        descr += screenshot ? `${screenshot.map(i => `[img]${i}[/img]`).join("\n")}` : "";

                        Gen.output(descr);
                    }

                    // 提前向SteamCN数据库请求中文名， 感谢 @Deparsoul 提供帮助与授权
                    $.ajax({
                        url: `https://steamdb.steamcn.com/app/${steam_id}/data.js?v=38`,
                        dataType: "text",  // 以“text”形式解析，防止以jsonp格式解析难以使用
                        success: data1 => {
                            let jsonp = JSON.parse(data1.match(/proc\((.+)\)/)[1]);
                            cname = jsonp.name_cn;
                            descriptionGenerator()
                        },
                    });

                    // 定位信息
                    let parser = html_parser(data);
                    let descr_anchor = parser.page.find("div#game_area_description");  // 游戏简介

                    // 开始解析页面信息
                    cover = (parser.page.find("img.game_header_image_full").attr("src") || "")
                        .replace(/^(.+?)(\?t=\d+)?$/,"$1");    // 游戏封面图

                    name = parser.page.find("div.apphub_AppName").text().trim();   // 游戏名(英文)
                    genre = parser.page.find("div.details_block a[href*='/genre/']").map((i,item) => {
                        return $(item).text().trim();
                    }).get();  // 类型
                    developer = parser.page.find("div.details_block  a[href*='/search/?developer=']").map((i,item) => {
                        return $(item).text().trim();
                    }).get();  // 开发商
                    publisher = parser.page.find("div.details_block  a[href*='/search/?publisher=']").map((i,item) => {
                        return $(item).text().trim();
                    }).get();  // 发行商
                    date = parser.page.find("div.release_date > div.date").text().trim();  // 发行日期
                    linkbar = (parser.page.find("a.linkbar:contains('访问网站')").attr("href") || "")
                        .replace(/^.+?url=(.+)$/,"$1");     // 官网
                    language = parser.page.find("table.game_language_options > tbody > tr:gt(0)").map((i,item) => {
                        const lag_checkcol_list = ["界面", "完全音频", "字幕"];
                        let tag = $(item);
                        if (tag.text().match(/不支持/)) return null;
                        else {
                            let lag_td = tag.find("td");
                            let lag_text = lag_td.eq(0).text().trim();
                            let lag_support_type = [];
                            for (let i=0;i<3;i++) {
                                if (lag_td.eq(i).find("img")) lag_support_type.push(lag_checkcol_list[i]);
                            }
                            return `${lag_text}(${lag_support_type})`
                        }
                    }).get().slice(0,5);
                    tags = parser.page.find("a.app_tag").map((i,item) => {
                        return $(item).text().trim();
                    }).get().slice(0,9);  // 标签
                    review = parser.page.find("div.user_reviews_summary_row").map((i,item) => {
                        let tag = $(item);
                        let review_type = tag.find("div.subtitle").text().trim().replace(/[:：]/,"");
                        let review_descr1 = tag.find("span.game_review_summary").text().trim();
                        let review_descr2 = tag.attr("data-tooltip-text").trim();
                        return `${review_type}： ${review_descr1} （${review_descr2}） `
                    }).get();

                    system.loadScript("static/lib/htmlconverter/html2bbcode.js",function () {
                        let converter = new html2bbcode.HTML2BBCode();
                        let bbcode = converter.feed(descr_anchor.html().replace("关于这款游戏",""));
                        introduce = bbcode.toString();
                    });

                    let os_dict = {"win": "Windows", "mac": "Mac OS X", "linux": "SteamOS + Linux"};
                    sysreq = parser.page.find("div.sysreq_contents > div.game_area_sys_req").map((i,item) => {
                        let tag = $(item);
                        let os_type = os_dict[tag.attr("data-os")];
                        let os_req = tag.html().replace('<div style="clear: both;"></div>',"")
                            .replace(/<br>/ig,"\n").replace(/<[^>]+?>/ig,"").trim()
                            .split("\n").map(i => i.trim()).join("\n");

                        return `${os_type}\n${os_req}`
                    }).get();

                    screenshot = parser.page.find("div.screenshot_holder a").map((i,item) => {
                        return $(item).attr("href").replace(/^.+?url=(http.+?)\.[\dx]+(.+?)(\?t=\d+)?$/,"$1$2")
                    }).get();  // 游戏截图

                    descriptionGenerator()
                }

                $.ajax({
                    type: "get",
                    url: `http://store.steampowered.com/app/${steam_id}/`, // 重写请求链接
                    success: data => {
                        if (/(欢迎来到|Welcome to) Steam/.test(data)) {
                            system.showErrorMessage("Steam 上不存在对应资源");
                            return;
                        }
                        if (/DoAgeGateSubmit\(\)/.test(data)) {
                            chrome.cookies.get({
                                url: "https://store.steampowered.com/",
                                name: "sessionid",
                            },(cookies) => {
                                let sessionid = cookies.value;
                                $.ajax({
                                    type: "post",
                                    url: "http://store.steampowered.com/agecheck/app/${steam_id}/",
                                    data: {
                                        "snr": "1_agecheck_agecheck__age-gate",
                                        "sessionid": sessionid,
                                        "ageDay": 1,
                                        "ageMonth": "January",
                                        "ageYear": "1979"
                                    },
                                    success: data1 => {
                                        steam_parser(data1);
                                    }
                                });
                            });  // 避免 Steam 年龄认证（年龄选择类） 做准备
                            return;
                        }

                        steam_parser(data);
                    }
                })
            }  // TODO Steam链接
            else {
                system.showErrorMessage("似乎并不认识这种链接(ノ｀Д)ノ");
            }  // 不支持的链接
        },  // 本地搜索方法

        gen_remote() {

        },    // TODO 使用远程API服务器

        gen(search_func) {
            let search_key = Gen.key();
            if (search_key.length === 0) {
                system.showErrorMessage("未输入搜索内容");
                return;
            }

            search_func = search_func || Gen.search.douban;
            if (/^http/.test(search_key)) {  // 识别为链接格式
                $("#gen-help").hide();   // 显示帮助表格
                $("#gen-out").show();   // 隐藏输出窗口
                system.showMessage("识别输入内容为链接格式，开始请求源数据....");
                if ($("#gen-remote").prop("checked")) {
                    Gen.gen_remote();
                } else {  // 使用本地解析
                    Gen.gen_locale();
                }
            } else {
                search_func();  // 默认使用豆瓣搜索文字形式格式
            }
        },

        init() {
            $("#extension").append($(Gen.html).hide());
            // 添加DOM监听
            $("#gen-search").click(() => {Gen.gen();});
            $("#gen-search-bgm").click(() => {Gen.gen(Gen.search.bangumi);});
            $("#gen-search-steam").click(() => {Gen.gen(Gen.search.steam);});
        }
    };

    $(document).ready(function() {
        Gen.init();
    });
})(jQuery);