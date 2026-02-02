export const AIRPORT_LINKS: Record<string, { nuri: string; cctv: string }> = {
    // Incheon
    RKSI: {
        nuri: "https://www.weather.go.kr/w/index.do?code=2811062000#dong/2811063000/37.4491/126.4509/인천공항",
        cctv: "https://www.utic.go.kr/jsp/map/cctvStream.jsp?cctvid=E913232&cctvname=%255B%25EC%259D%25B8%25EC%25B2%259C%25EB%258C%2580%25EA%25B5%2590%25EA%25B3%25A0%25EC%2586%258D%25EB%258F%2584%25EB%25A1%259C%255D%25EA%25B3%25B5%25ED%2595%25AD%25EC%258B%25A0%25EB%258F%2584%25EC%258B%259C%25EC%25A7%2584%25EC%259E%2585%25EB%25B6%2580&kind=Z3&cctvip=9346&cctvch=undefined&id=9346/KGSaWVOuT0waadCMK4rCPJVfLmbTAif26eiFAXvZw25Y6hvKoRBmJfbDmoU7xyi6mB8lZlokzWaIlIJ9oJMCL4bQHud4tqS37Q2jNCZYVoM=&cctvpasswd=undefined&cctvport=undefined&minX=126.43563476695948&minY=37.431775876648835&maxX=126.60889096537548&maxY=37.543924624825095"
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
        cctv: "https://www.utic.go.kr/jsp/map/cctvStream.jsp?cctvid=E901016&cctvname=%255B%25EA%25B9%2580%25ED%258F%25AC%25EA%25B3%25B5%25ED%2595%25AD%25EC%259E%2585%25EA%25B5%25AC&kind=Z3&cctvip=4093&cctvch=undefined&id=4093/Qb6EJA0v8K0h3r8ycqQnJwE4VlBDESUzzpcvBdOeLjHxFaw21zU1xoWBURO/q347x38CQWt9xZSZ/AE2sDILgMhrRgENt3o3wJFoy3PLGGI=&cctvpasswd=undefined&cctvport=undefined&minX=127.40382624355578&minY=36.671459065073165&maxX=127.57674204823188&maxY=36.782289477820875"
    },
    // Daegu
    RKTN: {
        nuri: "https://www.weather.go.kr/w/index.do?code=2714059000#dong/2714059000/35.8941/128.6591/대구공항",
        cctv: "https://www.utic.go.kr/jsp/map/cctvStream.jsp?cctvid=E100141&cctvname=%25EC%259E%2585%25EC%2584%259D%25EB%2584%25A4%25EA%25B1%25B0%25EB%25A6%25AC&kind=H&cctvip=undefined&cctvch=16&id=1&cctvpasswd=undefined&cctvport=undefined&minX=128.5544830467598&minY=35.85067693172178&maxX=128.68880575984753&maxY=35.92719596928562"
    },
    // Ulsan
    RKPU: {
        nuri: "https://www.weather.go.kr/w/index.do?code=3120051000#dong/3120051000/35.5936/129.3524/울산공항",
        cctv: "https://www.utic.go.kr/jsp/map/cctvStream.jsp?cctvid=L320197&cctvname=%25ED%2599%2594%25EB%25B4%2589%25EC%2582%25EA%25B1%25B0%25EB%25A6%25AC&kind=J&cctvip=undefined&cctvch=undefined&id=server1/live/C0200_01&cctvpasswd=undefined&cctvport=undefined&minX=129.27677916322787&minY=35.561694842258845&maxX=129.424651874931&maxY=35.62378793522817"
    },
    // Muan
    RKJB: {
        nuri: "https://www.weather.go.kr/w/index.do?code=4684034000#dong/4684034000/34.9914/126.3831/무안공항",
        cctv: "https://www.utic.go.kr/jsp/map/cctvStream.jsp?cctvid=E911333&cctvname=%255B%25EB%25AC%25B4%25EC%2595%2588%25EA%25B4%2591%25EC%25A3%25BC%25EC%2584%25A0%255D%25EB%25B6%2581%25EB%25AC%25B4%25EC%2595%2588&kind=Z3&cctvip=2543&cctvch=undefined&id=2543/exK1SA0Sip86Bo9aOsgpA9Tp9rX1x5h7YO/K%2BemrwYfZXysfPhgy5TsOWKEAsiyrAqbmYnErXEOA%2BXC9QahhDeX0uacZ4fmi5wwLVKb2FG0=&cctvpasswd=undefined&cctvport=undefined&minX=126.33982193655935&minY=34.94887678987434&maxX=126.50790569238477&maxY=35.061157056939635"
    },
    // Gwangju
    RKJJ: {
        nuri: "https://www.weather.go.kr/w/index.do?code=2920058000#dong/2920058000/35.1260/126.8080/광주공항",
        cctv: "https://www.utic.go.kr/jsp/map/cctvStream.jsp?cctvid=L310059&cctvname=%25EA%25B4%2591%25EC%25A3%25BC%25EA%25B3%25B5%25ED%2595%25AD%25EC%2582%25BC%25EA%25B1%25B0%25EB%25A6%25AC&kind=v&cctvip=undefined&cctvch=5&id=1045&cctvpasswd=undefined&cctvport=undefined&minX=126.7471571471842&minY=35.10798744892842&maxX=126.87885587044964&maxY=35.18639015863841"
    },
    // Yeosu
    RKJY: {
        nuri: "https://www.weather.go.kr/w/index.do?code=4613038000#dong/4613038000/34.8421/127.6171/여수공항",
        cctv: "https://www.utic.go.kr/jsp/map/cctvStream.jsp?cctvid=E900005&cctvname=%255B%25EA%25B5%25AD%25EB%258F%258417%25ED%2598%25B8%25EC%2584%25A0%255D%25EB%258D%2595%25EC%2596%2591%25EA%25B5%2590%25EC%25B0%25A8%25EB%25A1%259C&kind=Z3&cctvip=4338&cctvch=undefined&id=4338/%2BNAlmpvnoprNX6StxP%2BSZqcA5WCi611DdDpeBJw1dzVEnQX5d68mytbGqBKeW7ZNf5Ha77ZToJ9ZAu36S1%2B2zOf2d3dDyT6MwPIAPoM7UeI=&cctvpasswd=undefined&cctvport=undefined&minX=127.55238827158544&minY=34.76695985248867&maxX=127.72161222209823&maxY=34.877658787651086"
    },
    // Yangyang
    RKNY: {
        nuri: "https://www.weather.go.kr/w/index.do?code=5183033000#dong/5183033000/38.0617/128.6692/양양공항",
        cctv: "https://www.utic.go.kr/jsp/map/cctvStream.jsp?cctvid=E911304&cctvname=%255B%25EB%258F%2599%25ED%2595%25B4%25EC%2584%25A0%255D%25ED%2595%2598%25EC%25A1%25B0%25EB%258C%2580&kind=Z3&cctvip=2115&cctvch=undefined&id=2115/oz7uSXydMjKNfC8SthdXipH/aMM9Mg%2BM6sRNkpotpmPmThBRw6uBYhQVgc/WcT0z%2B/SAotbTCVWuxNIo0M0lD95ZG4OXOFUq%2BliKe1YQ9BM=&cctvpasswd=undefined&cctvport=undefined&minX=128.5873525287505&minY=37.98059782540932&maxX=128.76471427027894&maxY=38.08968084458662"
    },
    // Sacheon
    RKPS: {
        nuri: "https://www.weather.go.kr/w/index.do?code=4824025000#dong/4824025000/35.0888/128.0838/사천공항",
        cctv: "https://www.utic.go.kr/jsp/map/cctvStream.jsp?cctvid=E902862&cctvname=%255B%25EA%25B5%25AD%25EB%258F%258433%25ED%2598%25B8%25EC%2584%25A0%255D%25EB%25B0%25A9%25EA%25B3%25A1%25EA%25B5%2590%25EC%25B0%25A8%25EB%25A1%259C&kind=Z3&cctvip=72507&cctvch=undefined&id=72507/F%2BAloEQpuStt9tCnnGObJwUOxwF2nCyK2OWG9mgP9TJDRksFVBpmT/EPeOiwQizOBvTs30p/VVEZQKbqJZBL7xVPdjdKj7Q5/IrxypE4ixo=&cctvpasswd=undefined&cctvport=undefined&minX=128.03588121268314&minY=35.02434747327689&maxX=128.20618695038905&maxY=35.13438928828302"
    },
    // Pohang
    RKTH: {
        nuri: "https://www.weather.go.kr/w/index.do?code=4711132000#dong/4711132000/35.9877/129.4208/포항경주공항",
        cctv: "https://www.utic.go.kr/jsp/map/cctvStream.jsp?cctvid=L370006&cctvname=%25EA%25B3%25B5%25ED%2595%25AD%25EC%2582%25BC%25EA%25B1%25B0%25EB%25A6%25AC&kind=w&cctvip=undefined&cctvch=28&id=28&cctvpasswd=undefined&cctvport=1&minX=129.39110815476417&minY=35.9622303003326&maxX=129.47041113558765&maxY=35.99821536320358"
    },
    // Gunsan
    RKJK: {
        nuri: "https://www.weather.go.kr/w/index.do?code=4513036000#dong/4513036000/35.9039/126.6158/군산공항",
        cctv: "https://www.utic.go.kr/jsp/map/cctvStream.jsp?cctvid=E902000&cctvname=%255B%25EA%25B5%25AD%25EB%258F%258427%25ED%2598%25B8%25EC%2584%25A0%255D%25EA%25B5%25B0%25EC%2582%25B0%25EA%25B3%25A0%25EB%25B4%2589%25EA%25B5%2590%25EC%25B0%25A8%25EB%25A1%259C&kind=Z3&cctvip=71269&cctvch=undefined&id=71269/peQUf2RKDbaahfafyclEvjuEmXtLGjQsQsNXh0/XmaRi46Yawz0YrAvh5XqPmrg%2Bmk1iTbvnNi4wSVWdHGMLHYpGeIZBFMIf91iLiK1pH3c=&cctvpasswd=undefined&cctvport=undefined&minX=126.72129851386853&minY=35.949926609696284&maxX=126.81151550008381&maxY=36.01084029706507"
    },
    // Wonju
    RKNW: {
        nuri: "https://www.weather.go.kr/w/index.do?code=5173025000#dong/5173025000/37.4592/127.9611/원주공항",
        cctv: "https://www.utic.go.kr/jsp/map/cctvStream.jsp?cctvid=E904920&cctvname=%255B%25EA%25B5%25AD%25EB%258F%25845%25ED%2598%25B8%25EC%2584%25A0%255D%25EC%259B%2590%25EC%25A3%25BC%25EA%25B3%25B5%25ED%2595%25AD&kind=Z3&cctvip=71563&cctvch=undefined&id=71563/w/CD5a%2B4Ca2SqEMEVKBx/EILOyKbzX0QWe9GcAdGfPg34yNfOfYluzMXEBxnSJhfEcd01Mn79XlfMmHMVkWP5rQnI9NmJFgP9eG0SWhGDdc=&cctvpasswd=undefined&cctvport=undefined&minX=127.91707739655133&minY=37.40665377417331&maxX=128.0534360386715&maxY=37.48378645501284"
    }
};
