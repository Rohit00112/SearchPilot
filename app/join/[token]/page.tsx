import JoinPage from '@/components/team/join-page';
export default async function Join({params}:{params:Promise<{token:string}>}){const {token}=await params;return <JoinPage token={token}/>;}
