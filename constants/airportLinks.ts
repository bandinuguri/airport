export const AIRPORT_LINKS: Record<string, { nuri: string; cctv: string }> = {
    // Incheon
    RKSI: {
        nuri: "https://www.weather.go.kr/w/index.do?code=2811062000#dong/2811063000/37.4491/126.4509/인천공항",
        cctv: ""
    },
    // Gimpo
    RKSS: {
        nuri: "https://www.weather.go.kr/w/index.do?code=1150061500#dong/1150061500/37.5583/126.8028/김포공항",
        cctv: "https://www.utic.go.kr/jsp/map/cctvStream.jsp?cctvid=L010054&cctvname=%25EA%25B9%2580%25ED%258F%25AC%25EA%25B3%25B5%25ED%2595%25AD%25EC%259E%2585%25EA%25B5%25AC&kind=Seoul&cctvip=undefined&cctvch=51&id=90&cctvpasswd=undefined&cctvport=undefined&minX=126.74612643404012&minY=37.52829002404771&maxX=126.86844781511533&maxY=37.58993822848175"
    },
    // Jeju
    RKPC: {
        nuri: "https://www.weather.go.kr/w/index.do?code=5011059000#dong/5011059000/33.5113/126.4930/제주공항",
        cctv: "http://123.140.197.51/stream/33/play.m3u8"
    },
    // Gimhae
    RKPK: {
        nuri: "https://www.weather.go.kr/w/index.do?code=2644052000#dong/2644052000/35.1795/128.9382/김해공항",
        cctv: "https://www.utic.go.kr/jsp/map/cctvStream.jsp?cctvid=L230071&cctvname=%25EC%2584%259C%25EB%25B6%2580%25EC%2582%25B0IC&kind=I&cctvip=225&cctvch=74&id=3&cctvpasswd=undefined&cctvport=undefined&minX=128.89120756784547&minY=35.14526399804108&maxX=129.01144916647246&maxY=35.204962812394"
    },
    // Cheongju
    RKTU: {
        nuri: "https://www.weather.go.kr/w/index.do?code=4311425300#dong/4311425300/36.7219/127.4914/청주공항",
        cctv: ""
    },
    // Daegu
    RKTN: {
        nuri: "https://www.weather.go.kr/w/index.do?code=2714059000#dong/2714059000/35.8941/128.6591/대구공항",
        cctv: "https://www.utic.go.kr/jsp/map/cctvStream.jsp?cctvid=E100141&cctvname=%25EC%259E%2585%25EC%2584%259D%25EB%2584%25A4%25EA%25B1%25B0%25EB%25A6%25AC&kind=H&cctvip=undefined&cctvch=16&id=1&cctvpasswd=undefined&cctvport=undefined&minX=128.5544830467598&minY=35.85067693172178&maxX=128.68880575984753&maxY=35.92719596928562"
    },
    // Ulsan
    RKPU: {
        nuri: "https://www.weather.go.kr/w/index.do?code=3120051000#dong/3120051000/35.5936/129.3524/울산공항",
        cctv: "https://www.utic.go.kr/jsp/map/cctvStream.jsp?cctvid=L320197&cctvname=%25ED%2599%2594%25EB%25B4%2589%25EC%2582%25B산%25EA%25B1%25B0%25EB%25A6%25AC&kind=J&cctvip=undefined&cctvch=undefined&id=server1/live/C0200_01&cctvpasswd=undefined&cctvport=undefined&minX=129.27677916322787&minY=35.561694842258845&maxX=129.424651874931&maxY=35.62378793522817"
    },
    // Muan
    RKJB: {
        nuri: "https://www.weather.go.kr/w/index.do?code=4684034000#dong/4684034000/34.9914/126.3831/무안공항",
        cctv: ""
    },
    // Gwangju
    RKJJ: {
        nuri: "https://www.weather.go.kr/w/index.do?code=2920058000#dong/2920058000/35.1260/126.8080/광주공항",
        cctv: "https://www.utic.go.kr/jsp/map/cctvStream.jsp?cctvid=L310059&cctvname=%25EA%25B4%2591%25EC%25A3%25BC%25EA%25B3%25B5%25ED%2595%25AD%25EC%2582%25BC%25EA%25B1%25B0%25EB%25A6%25AC&kind=v&cctvip=undefined&cctvch=5&id=1045&cctvpasswd=undefined&cctvport=undefined&minX=126.7471571471842&minY=35.10798744892842&maxX=126.87885587044964&maxY=35.18639015863841"
    },
    // Yeosu
    RKJY: {
        nuri: "https://www.weather.go.kr/w/index.do?code=4613038000#dong/4613038000/34.8421/127.6171/여수공항",
        cctv: ""
    },
    // Yangyang
    RKNY: {
        nuri: "https://www.weather.go.kr/w/index.do?code=5183033000#dong/5183033000/38.0617/128.6692/양양공항",
        cctv: ""
    },
    // Sacheon
    RKPS: {
        nuri: "https://www.weather.go.kr/w/index.do?code=4824025000#dong/4824025000/35.0888/128.0838/사천공항",
        cctv: ""
    },
    // Pohang
    RKTH: {
        nuri: "https://www.weather.go.kr/w/index.do?code=4711132000#dong/4711132000/35.9877/129.4208/포항경주공항",
        cctv: "https://www.utic.go.kr/jsp/map/cctvStream.jsp?cctvid=L370006&cctvname=%25EA%25B3%25B5%25ED%2595%25AD%25EC%2582%25BC%25EA%25B1%25B0%25EB%25A6%25AC&kind=w&cctvip=undefined&cctvch=28&id=28&cctvpasswd=undefined&cctvport=1&minX=129.39110815476417&minY=35.9622303003326&maxX=129.47041113558765&maxY=35.99821536320358"
    },
    // Gunsan
    RKJK: {
        nuri: "https://www.weather.go.kr/w/index.do?code=4513036000#dong/4513036000/35.9039/126.6158/군산공항",
        cctv: ""
    },
    // Wonju
    RKNW: {
        nuri: "https://www.weather.go.kr/w/index.do?code=5173025000#dong/5173025000/37.4592/127.9611/원주공항",
        cctv: ""
    }
};
